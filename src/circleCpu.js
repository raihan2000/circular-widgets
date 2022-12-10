const { Clutter, GObject, GLib, Gio, PangoCairo, Pango, St, Meta, Shell, Gdk } = imports.gi;
const DND = imports.ui.dnd;
const Cairo		 = imports.cairo;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

var Cpu = GObject.registerClass(
class circleCpu extends St.BoxLayout {
		_init() {
			super._init({
				reactive: true,
			});
			this._settings = ExtensionUtils.getSettings();
			this.lastCPUTotal = 0;
			this.lastCPUUsed = 0;
			this._actor = new Clutter.Actor();
			this.add_child(this._actor);
			this._canvas = new Clutter.Canvas();
			this._updateSettings();

      this._draggable = DND.makeDraggable(this)
      this._draggable._animateDragEnd = (eventTime) => {
          this._draggable._animationInProgress = true;
          this._draggable._onAnimationComplete(this._draggable._dragActor, eventTime);
        };
      this._draggable.connect('drag-begin', this._onDragBegin.bind(this));
      this._draggable.connect('drag-end', this._onDragEnd.bind(this));

			this._toggleShow();
			this.setPosition();
		}

		_toggleShow() {
			this.remove_all_children();
			if(!this._settings.get_boolean('hide-cpu-widget'))
				this.add_child(this._actor);

			this.actor_init();			
			this.update();
		}

		actor_init() {
			this._size = this._settings.get_int('circular-cpu-size');
			this._canvas.set_size(this._size,this._size);
			this._actor.set_content(this._canvas);
			this._actor.set_size(this._size,this._size);
		}
		
		draw_stuff(canvas, cr, width, height) {
			cr.setOperator(Cairo.Operator.CLEAR);
			cr.paint();

			cr.setOperator(Cairo.Operator.OVER);
			cr.translate(width/2, height/2);

			let fcolor = this._settings.get_string('cpu-line-color');
			let color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,0.3);
			cr.rotate(-this._settings.get_double('cpu-ring-startpoint')*Math.PI);
			cr.save();
			cr.setLineWidth(this._settings.get_double('cpu-line-width'));
			cr.arc(0,0,this._settings.get_double('cpu-ring-radius'),0,this._settings.get_double('cpu-ring-endpoint') * Math.PI);
			cr.stroke();
			
			if(this._settings.get_boolean('cpu-inner-circle')) {
			cr.arc(0,0,this._settings.get_double('cpu-inner-circle-radius'),0,2*Math.PI);
			cr.fill();}

			//cpu
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			cr.arc(0,0,this._settings.get_double('cpu-ring-radius'),0,this.currentCpu/100 *this._settings.get_double('cpu-ring-endpoint')* Math.PI);
			cr.stroke();

			// text
			cr.rotate(this._settings.get_double('cpu-ring-startpoint')*Math.PI);
			fcolor = this._settings.get_string('cpu-text-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			let font = this._settings.get_string('cpu-text-font');

			if(!this._settings.get_boolean('enable-inline-cpu')){
				cr.moveTo(this._settings.get_int('cpu-text-position-x'), this._settings.get_int('cpu-text-position-y'));
				cr.save();
				this.text_show(cr, "CPU\n" +this.currentCpu.toString() + "%",font);
			} else {
				cr.moveTo(this._settings.get_int('cpu-inline-text-position-x'), this._settings.get_int('cpu-inline-text-position-y'));
				cr.save();
				this.text_show(cr,"CPU "+this.currentCpu.toString()+"%",font);				
			}
			cr.restore();
			
			return true;
		}
		
		update() {
			let usage = this.getCurrentCPUUsage();
			this.currentCpu = Math.floor(usage * 100);
			this._canvas.connect ("draw", this.draw_stuff.bind(this));
			this._canvas.invalidate();
		}

		// See <https://stackoverflow.com/a/9229580>.
		getCurrentCPUUsage() {
    	let currentCPUUsage = 0;

      const inputFile = Gio.File.new_for_path('/proc/stat');
      const [, content] = inputFile.load_contents(null);
      const contentStr = ByteArray.toString(content);
      const contentLines = contentStr.split('\n');

      let currentCPUUsed = 0;
      let currentCPUTotal = 0;

      for (let i = 0; i < contentLines.length; i++) {
          const fields = contentLines[i].trim().split(/\W+/);

          if (fields.length < 2) {
              continue;
          }

          const itemName = fields[0];
          if (itemName == 'cpu' && fields.length >= 5) {
              const user = Number.parseInt(fields[1]);
              const system = Number.parseInt(fields[3]);
              const idle = Number.parseInt(fields[4]);
              currentCPUUsed = user + system;
              currentCPUTotal = user + system + idle;
              break;
          }
      }

        // Avoid divide by zero
      if (currentCPUTotal - this.lastCPUTotal !== 0) {
          currentCPUUsage = (currentCPUUsed - this.lastCPUUsed) / (currentCPUTotal - this.lastCPUTotal);
      }

      this.lastCPUTotal = currentCPUTotal;
      this.lastCPUUsed = currentCPUUsed;
    return currentCPUUsage;
	}
	
	text_show(cr, showtext, font) {
			let pl = PangoCairo.create_layout(cr);
			pl.set_text(showtext, -1);
			pl.set_font_description(Pango.FontDescription.from_string(font));
			PangoCairo.update_layout(cr, pl);
			let [w, h] = pl.get_pixel_size();
			cr.relMoveTo(-w / 2, 0);
			PangoCairo.show_layout(cr, pl);
			cr.relMoveTo(w / 2, 0);
		}
		
    _getMetaRectForCoords(x, y){
        this.get_allocation_box();
        let rect = new Meta.Rectangle();
    
        [rect.x, rect.y] = [x, y];
        [rect.width, rect.height] = this.get_transformed_size();
        return rect;
    }
    
    _getWorkAreaForRect(rect){
        let monitorIndex = global.display.get_monitor_index_for_rect(rect);
        return Main.layoutManager.getWorkAreaForMonitor(monitorIndex);
    }

    _isOnScreen(x, y){
        let rect = this._getMetaRectForCoords(x, y);
        let monitorWorkArea = this._getWorkAreaForRect(rect);

        return monitorWorkArea.contains_rect(rect);
    }

    _keepOnScreen(x, y){
        let rect = this._getMetaRectForCoords(x, y);
        let monitorWorkArea = this._getWorkAreaForRect(rect);

        let monitorRight = monitorWorkArea.x + monitorWorkArea.width;
        let monitorBottom = monitorWorkArea.y + monitorWorkArea.height;

        x = Math.min(Math.max(monitorWorkArea.x, x), monitorRight - rect.width);
        y = Math.min(Math.max(monitorWorkArea.y, y), monitorBottom - rect.height);

        return [x, y];
    }

    setPosition(){
        if(this._ignorePositionUpdate)
            return;

        let [x, y] = this._settings.get_value('circular-cpu-location').deep_unpack();
        this.set_position(x, y);

        if(!this.get_parent())
            return;

        if(!this._isOnScreen(x, y)){
            [x, y] = this._keepOnScreen(x, y);

            this.ease({
                x,
                y,
                duration: 150,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });

            this._ignorePositionUpdate = true;
            this._settings.set_value('circular-cpu-location', new GLib.Variant('(ii)', [x, y]));
            this._ignorePositionUpdate = false;
        }
    }


    _onDragBegin() {
        this.isDragging = true;
        this._dragMonitor = {
            dragMotion: this._onDragMotion.bind(this)
        };
        DND.addDragMonitor(this._dragMonitor);

        let p = this.get_transformed_position();
        this.startX = this.oldX = p[0];
        this.startY = this.oldY = p[1];

        this.get_allocation_box();
        this.rowHeight = this.height;
        this.rowWidth = this.width;
    }

    _onDragMotion(dragEvent) {
        this.deltaX = dragEvent.x - ( dragEvent.x - this.oldX );
        this.deltaY = dragEvent.y - ( dragEvent.y - this.oldY );

        let p = this.get_transformed_position();
        this.oldX = p[0];
        this.oldY = p[1];

        return DND.DragMotionResult.CONTINUE;
    }

    _onDragEnd() {
        if (this._dragMonitor) {
            DND.removeDragMonitor(this._dragMonitor);
            this._dragMonitor = null;
        }

        this.set_position(this.deltaX, this.deltaY);

        this.ignoreUpdatePosition = true;
        this._settings.set_value('circular-cpu-location', new GLib.Variant('(ii)', [this.deltaX, this.deltaY]));
        this.ignoreUpdatePosition = false;
    }

    getDragActor() {
    }

    getDragActorSource() {
        return this;
    }
    
    _updateSettings() {
			this._settings.connect('changed::circular-cpu-location', () => this.setPosition());
			this._settings.connect('changed::clock-inner-circle', () => this.update());
			this._settings.connect('changed::cpu-line-color', () => this.update());
			this._settings.connect('changed::cpu-line-width', () => this.update());
			this._settings.connect('changed::cpu-text-font', () => this.update());
			this._settings.connect('changed::cpu-text-color', () => this.update());
			this._settings.connect('changed::circular-cpu-size', () => this.actor_init());
			this._settings.connect('changed::cpu-inner-circle', () => this.update());
			this._settings.connect('changed::enable-inline-cpu', () => this.update());
			this._settings.connect('changed::cpu-ring-startpoint', () => this.update());
			this._settings.connect('changed::cpu-ring-endpoint', () => this.update());
			this._settings.connect('changed::cpu-text-position-x', () => this.update());
			this._settings.connect('changed::cpu-text-position-y', () => this.update());
			this._settings.connect('changed::cpu-inline-text-position-x', () => this.update());
			this._settings.connect('changed::cpu-inline-text-position-y', () => this.update());
			this._settings.connect('changed::cpu-ring-radius', () => this.update());
			this._settings.connect('changed::cpu-inner-circle-radius', () => this.update());
			this._settings.connect('changed::hide-cpu-widget', () => this._toggleShow());
    }
});
