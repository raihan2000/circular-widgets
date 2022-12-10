const { Clutter, GObject, GLib, PangoCairo, Pango, St, Gio, Meta, Shell, Gdk } = imports.gi;
const DND = imports.ui.dnd;
const Cairo		 = imports.cairo;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

var Clock = GObject.registerClass(
class circleClock extends St.BoxLayout {
		_init() {
			super._init({
				reactive: true,
			});
			this._settings = ExtensionUtils.getSettings();
			this._actor = new Clutter.Actor();
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
			if(!this._settings.get_boolean('hide-clock-widget'))
				this.add_child(this._actor);
			this.actor_init();			
			this.update();
		}

		actor_init() {
			this._size = this._settings.get_int('circular-clock-size');
			this._actor.set_size(this._size,this._size);
			this._actor.set_content(this._canvas);
			this._canvas.set_size(this._size,this._size);
		}

		draw_stuff(canvas, cr, width, height) {
			cr.setOperator(Cairo.Operator.CLEAR);
			cr.paint();
			cr.setOperator(Cairo.Operator.OVER);
			cr.translate(width/2, height/2);

			if(this._settings.get_boolean('sweeping-motion-clock')){
				let micro = parseInt(this._Gdate.format("%f"));
				this._mili = micro / 1000;
				let difSec = parseInt(this._Gdate.format("%S")) + this._mili / 1000;
				this._sec = difSec / 60;
				let difMin = parseInt(this._Gdate.format("%M")) + this._sec;
				this._min = difMin / 60;
				let difHour = parseInt(this._Gdate.format("%H")) % 12 + this._min;
				this._hour = difHour / 12;
			} else {
				this._sec = this._Gdate.format("%S");
				this._min = this._Gdate.format("%M");
				this._hour = this._Gdate.format("%H");
				if(this._hour > 12) {this._hour = this._hour - 12}
			}

			//sec
			let fcolor = this._settings.get_string('clock-sec-color');
			let color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,0.3);
			cr.rotate(-Math.PI/2);
			cr.save();
			cr.setLineWidth(this._settings.get_double('clock-sec-ring-width'));
			if(!this._settings.get_boolean('clock-sec-ring')) {
			cr.arc(0,0,this._settings.get_double('clock-sec-ring-radius'),0,2 * Math.PI);
			cr.stroke();
			
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			this._settings.get_boolean('sweeping-motion-clock')?cr.arc(0,0,this._settings.get_double('clock-sec-ring-radius'),0,this._sec * 2*Math.PI):cr.arc(0,0,this._settings.get_double('clock-sec-ring-radius'),0,this._sec * Math.PI/30)
			cr.stroke(); }
			
			//min
			if(!this._settings.get_boolean('clock-min-ring')) {
			fcolor = this._settings.get_string('clock-min-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,0.3);
			cr.save();
			cr.setLineWidth(this._settings.get_double('clock-min-ring-width'));
			cr.arc(0,0,this._settings.get_double('clock-min-ring-radius'),0,2*Math.PI);
			cr.stroke();
			
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			this._settings.get_boolean('sweeping-motion-clock')?cr.arc(0,0,this._settings.get_double('clock-min-ring-radius'),0,this._min * 2*Math.PI):cr.arc(0,0,this._settings.get_double('clock-min-ring-radius'),0,this._min * Math.PI/30)
			cr.stroke(); }

			//hour
			if(!this._settings.get_boolean('clock-hour-ring')) {
			fcolor = this._settings.get_string('clock-hour-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,0.3);
			cr.save();
			cr.setLineWidth(this._settings.get_double('clock-hour-ring-width'));
			cr.arc(0,0,this._settings.get_double('clock-hour-ring-radius'),0,2*Math.PI);
			cr.stroke();

			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			this._settings.get_boolean('sweeping-motion-clock')?cr.arc(0,0,this._settings.get_double('clock-hour-ring-radius'),0,this._hour * 2*Math.PI):cr.arc(0,0,this._settings.get_double('clock-hour-ring-radius'),0,this._hour * Math.PI/6)
			cr.stroke(); }

			// text
			cr.rotate(Math.PI/2);
			if(!this._settings.get_boolean('text-clock')) {
			this._settings.get_boolean('am-or-pm-clock')?cr.moveTo(0, -20):cr.moveTo(0,-10)
			fcolor = this._settings.get_string('clock-text-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.save();
			let font = this._settings.get_string('clock-text-font');
			this.text_show(cr, this.clockText, font); }

//hour
			fcolor = this._settings.get_string('clock-hour-hand-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.rotate(-Math.PI/2);
			cr.setLineWidth(this._settings.get_double('clock-hour-hand-width'));
			cr.setLineCap(Cairo.LineCap.ROUND);
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.moveTo(0,0);
			this._settings.get_boolean('sweeping-motion-clock')?cr.rotate(this._hour*2*Math.PI):cr.rotate(this._hour*Math.PI/6)
			cr.save();
			if(!this._settings.get_boolean('clock-hour-hand')) {
			cr.lineTo(this._settings.get_double('clock-hour-hand-height'),0);
			cr.stroke(); }
			this._settings.get_boolean('sweeping-motion-clock')?cr.rotate(-this._hour*2*Math.PI):cr.rotate(-this._hour*Math.PI/6)
			cr.save();
//min
			fcolor = this._settings.get_string('clock-min-hand-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setLineWidth(this._settings.get_double('clock-min-hand-width'));
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.moveTo(0,0);
			this._settings.get_boolean('sweeping-motion-clock')?cr.rotate(this._min*2*Math.PI):cr.rotate(this._min*Math.PI/30)
			cr.save();
			if(!this._settings.get_boolean('clock-min-hand')) {
			cr.lineTo(this._settings.get_double('clock-min-hand-height'),0);
			cr.stroke(); }
			this._settings.get_boolean('sweeping-motion-clock')?cr.rotate(-this._min*2*Math.PI):cr.rotate(-this._min*Math.PI/30)
			cr.save();

//sec
			fcolor = this._settings.get_string('clock-sec-hand-color');
			color = new Gdk.RGBA();
			color.parse(fcolor);
			cr.setLineWidth(this._settings.get_double('clock-sec-hand-width'));
			cr.setSourceRGBA(color.red,color.green,color.blue,color.alpha);
			cr.moveTo(0,0);
			this._settings.get_boolean('sweeping-motion-clock')?cr.rotate(this._sec*2*Math.PI):cr.rotate(this._sec*Math.PI/30)
			cr.save();
			if(!this._settings.get_boolean('clock-sec-hand')) {
			cr.lineTo(this._settings.get_double('clock-sec-hand-height'),0);
			cr.stroke(); }
			
			cr.restore();
    	return true;
		}
		
		update() {
			this._Gdate = GLib.DateTime.new_now_local();
			this._canvas.connect ("draw", this.draw_stuff.bind(this));
			this.update_text();
		}
		
		update_text() {
			this._Gsec = this._Gdate.format("%S");
			this._Gmin = this._Gdate.format("%M");
			this._Ghour = this._Gdate.format("%H");
			if(this._Ghour > 12) {this._Ghour = this._Ghour - 12}

			!this._settings.get_boolean('am-or-pm-clock')?this.clockText = this._Gdate.format("%H:%M"):(this._Gdate.format("%H")>=12)?this.clockText = this._Ghour + ":" + this._Gmin + "\n" + " PM":(this._Ghour>1)?this.clockText = "12" + this._Gmin + "\n" + " AM":this.clockText = this._Ghour + ":" + this._Gmin + "\n" + " AM"
			this._canvas.invalidate();
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

        let [x, y] = this._settings.get_value('circular-clock-location').deep_unpack();
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
            this._settings.set_value('circular-clock-location', new GLib.Variant('(ii)', [x, y]));
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
        this._settings.set_value('circular-clock-location', new GLib.Variant('(ii)', [this.deltaX, this.deltaY]));
        this.ignoreUpdatePosition = false;
    }

    getDragActor() {
    }

    getDragActorSource() {
        return this;
    }
    
    _updateSettings() {
    	this._settings.connect('changed::circular-clock-location', () => this.setPosition());
			this._settings.connect('changed::am-or-pm-clock', () => this.update_text());
			this._settings.connect('changed::clock-sec-hand-height', () => this.update());
			this._settings.connect('changed::clock-sec-hand-width', () => this.update());
			this._settings.connect('changed::clock-sec-hand', () => this.update());
			this._settings.connect('changed::clock-min-hand-height', () => this.update());
			this._settings.connect('changed::clock-min-hand-width', () => this.update());
			this._settings.connect('changed::clock-min-hand', () => this.update());
			this._settings.connect('changed::clock-hour-hand-height', () => this.update());
			this._settings.connect('changed::clock-hour-hand-width', () => this.update());
			this._settings.connect('changed::clock-hour-hand', () => this.update());
			this._settings.connect('changed::clock-sec-ring', () => this.update());
			this._settings.connect('changed::clock-sec-ring-radius', () => this.update());
			this._settings.connect('changed::clock-sec-ring-width', () => this.update());
			this._settings.connect('changed::clock-min-ring', () => this.update());
			this._settings.connect('changed::clock-min-ring-radius', () => this.update());
			this._settings.connect('changed::clock-min-ring-width', () => this.update());
			this._settings.connect('changed::clock-hour-ring', () => this.update());
			this._settings.connect('changed::clock-hour-ring-radius', () => this.update());
			this._settings.connect('changed::clock-hour-ring-width', () => this.update());
			this._settings.connect('changed::text-clock', () => this.update());
			this._settings.connect('changed::sweeping-motion-clock', () => this.update());
			this._settings.connect('changed::clock-line-width', () => this.update());
			this._settings.connect('changed::clock-hour-color', () => this.update());
			this._settings.connect('changed::clock-min-color', () => this.update());
			this._settings.connect('changed::clock-sec-color', () => this.update());
			this._settings.connect('changed::clock-text-font', () => this.update());
			this._settings.connect('changed::clock-text-color', () => this.update());
			this._settings.connect('changed::circular-clock-size', () => this.actor_init());
			this._settings.connect('changed::clock-hour-hand-color', () => this.update());
			this._settings.connect('changed::clock-min-hand-color', () => this.update());
			this._settings.connect('changed::clock-sec-hand-color', () => this.update());
			this._settings.connect('changed::hide-clock-widget', () => this._toggleShow());
    }
});
