const { Clutter, GObject, GLib, Gio, PangoCairo, Pango, St, Meta, Shell, Gdk } = imports.gi;
const DND = imports.ui.dnd;
const Cairo		 = imports.cairo;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

var NetSpeed = GObject.registerClass(
class circleNetSpeed extends St.BoxLayout {
		_init() {
			super._init({
				reactive: true,
			});
			this._settings = ExtensionUtils.getSettings();
			this.lastTotalNetDownBytes = 0;
			this.lastTotalNetUpBytes = 0;
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
			if(!this._settings.get_boolean('hide-netspeed-widget'))
				this.add_child(this._actor);
			this.actor_init();			
			this.update();
		}

		actor_init() {
			this._size = this._settings.get_int('circular-netspeed-size');
			this._canvas.set_size(this._size,this._size);
			this._actor.set_content(this._canvas);
			this._actor.set_size(this._size,this._size);
		}
		
		draw_stuff(canvas, cr, width, height) {
			cr.setOperator(Cairo.Operator.CLEAR);
			cr.paint();
			cr.setOperator(Cairo.Operator.OVER);
			cr.translate(width/2, height/2);

			let fcolor = this._settings.get_string('netspeed-down-ring-color');
			let color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,0.3);
			cr.rotate(-this._settings.get_double('netspeed-ring-startpoint')*Math.PI);
			cr.save();
			cr.setLineWidth(this._settings.get_double('netspeed-down-ring-width'));
			cr.arc(0,0,this._settings.get_double('netspeed-down-ring-radius'),0,this._settings.get_double('netspeed-ring-endpoint') * Math.PI);
			cr.stroke();

			//netspeed download speed ring
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			cr.arc(0,0,this._settings.get_double('netspeed-down-ring-radius'),0,(this._controllSpd(this._currentUsage['down'])/1000)*this._settings.get_double('netspeed-ring-endpoint')* Math.PI);
			cr.stroke();

			//netspeed upload speed ring
			fcolor = this._settings.get_string('netspeed-up-ring-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,0.3);
			cr.setLineWidth(this._settings.get_double('netspeed-up-ring-width'));
			cr.save();
			cr.arc(0,0,this._settings.get_double('netspeed-up-ring-radius'),0,this._settings.get_double('netspeed-ring-endpoint')* Math.PI);
			cr.stroke();

			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			cr.arc(0,0,this._settings.get_double('netspeed-up-ring-radius'),0,(this._controllSpd(this._currentUsage['up'])/1000) *this._settings.get_double('netspeed-ring-endpoint')* Math.PI);
			cr.stroke();

			// text
			cr.rotate(this._settings.get_double('netspeed-ring-startpoint')*Math.PI);
			fcolor = this._settings.get_string('netspeed-text-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			cr.moveTo(this._settings.get_int('netspeed-text-position-x'),this._settings.get_int('netspeed-text-position-y'));
			cr.save();
			let font = this._settings.get_string('netspeed-text-font');
			this.text_show(cr,"up "+this._shortStr(this._currentUsage['up'])+"\ndw "+this._shortStr(this._currentUsage['down']),font);

			cr.restore();
			
			return true;
		}
		
		update() {
			this._currentUsage = this.getCurrentNetSpeed();		
			this._canvas.connect ("draw", this.draw_stuff.bind(this));
			this._canvas.invalidate();
		}

	_controllSpd(i) {
		let o;
		if (i > 1e12) {
			o = (i / 1e12).toFixed(1);
			return o;
		}
		if (i > 1e9) {
			o = (i / 1e9).toFixed(1);
			return o;
		}
		if (i > 1e6) {
			o = (i / 1e6).toFixed(1);
			return o;
		}
		if (i > 1000) {
			o = (i / 1000).toFixed(1);
			return o;
		}
		return i.toFixed(0);
	}

	_shortStr(i) {
		let o;
		if (i > 1e12) {
			o = (i / 1e12).toFixed(1);
			return o + "TB/s";
		}
		if (i > 1e9) {
			o = (i / 1e9).toFixed(1);
			return o + "GB/s";
		}
		if (i > 1e6) {
			o = (i / 1e6).toFixed(1);
			return o + "MB/s";
		}
		if (i > 1000) {
			o = (i / 1000).toFixed(1);
			return o + "KB/s";
		}
		return i.toFixed(0) + "B/s";
	}

// See <https://github.com/AlynxZhou/gnome-shell-extension-net-speed>.
		getCurrentNetSpeed() {
    	const netSpeed = { down: 0, up: 0 };

      const inputFile = Gio.File.new_for_path('/proc/net/dev');
      const [, content] = inputFile.load_contents(null);
      const contentStr = ByteArray.toString(content);
      const contentLines = contentStr.split('\n');

      // Caculate the sum of all interfaces' traffic line by line.
      let totalDownBytes = 0;
      let totalUpBytes = 0;

      for (let i = 0; i < contentLines.length; i++) {
          const fields = contentLines[i].trim().split(/\W+/);
          if (fields.length <= 2) {
              break;
          }

          // Skip virtual interfaces.
          const networkInterface = fields[0];
          const currentInterfaceDownBytes = Number.parseInt(fields[1]);
          const currentInterfaceUpBytes = Number.parseInt(fields[9]);
          if (
              networkInterface == 'lo' ||
              // Created by python-based bandwidth manager "traffictoll".
              networkInterface.match(/^ifb[0-9]+/) ||
              // Created by lxd container manager.
              networkInterface.match(/^lxdbr[0-9]+/) ||
              networkInterface.match(/^virbr[0-9]+/) ||
              networkInterface.match(/^br[0-9]+/) ||
              networkInterface.match(/^vnet[0-9]+/) ||
              networkInterface.match(/^tun[0-9]+/) ||
              networkInterface.match(/^tap[0-9]+/) ||
              isNaN(currentInterfaceDownBytes) ||
              isNaN(currentInterfaceUpBytes)
          ) {
              continue;
          }

          totalDownBytes += currentInterfaceDownBytes;
          totalUpBytes += currentInterfaceUpBytes;
        }

        if (this.lastTotalNetDownBytes === 0) {
            this.lastTotalNetDownBytes = totalDownBytes;
        }
        if (this.lastTotalNetUpBytes === 0) {
            this.lastTotalNetUpBytes = totalUpBytes;
        }

        netSpeed['down'] = (totalDownBytes - this.lastTotalNetDownBytes);
        netSpeed['up'] = (totalUpBytes - this.lastTotalNetUpBytes);

        this.lastTotalNetDownBytes = totalDownBytes;
        this.lastTotalNetUpBytes = totalUpBytes;

    return netSpeed;
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

        let [x, y] = this._settings.get_value('circular-netspeed-location').deep_unpack();
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
            this._settings.set_value('circular-netspeed-location', new GLib.Variant('(ii)', [x, y]));
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
        this._settings.set_value('circular-netspeed-location', new GLib.Variant('(ii)', [this.deltaX, this.deltaY]));
        this.ignoreUpdatePosition = false;
    }

    getDragActor() {
    }

    getDragActorSource() {
        return this;
    }
    
    _updateSettings() {
			this._settings.connect('changed::circular-netspeed-location', () => this.setPosition());
			this._settings.connect('changed::netspeed-up-ring-color', () => this.update());
			this._settings.connect('changed::netspeed-up-ring-width', () => this.update());
			this._settings.connect('changed::netspeed-up-ring-radius', () => this.update());
			this._settings.connect('changed::netspeed-down-ring-color', () => this.update());
			this._settings.connect('changed::netspeed-down-ring-width', () => this.update());
			this._settings.connect('changed::netspeed-down-ring-radius', () => this.update());
			this._settings.connect('changed::netspeed-text-font', () => this.update());
			this._settings.connect('changed::netspeed-text-color', () => this.update());
			this._settings.connect('changed::circular-netspeed-size', () => this.actor_init());
			this._settings.connect('changed::netspeed-ring-startpoint', () => this.update());
			this._settings.connect('changed::netspeed-ring-endpoint', () => this.update());
			this._settings.connect('changed::netspeed-text-position-x', () => this.update());
			this._settings.connect('changed::netspeed-text-position-y', () => this.update());
			this._settings.connect('changed::hide-netspeed-widget', () => this._toggleShow());
    }
});
