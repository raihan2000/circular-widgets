const { Clutter, GObject, GLib, Gio, PangoCairo, Pango, St, Meta, Shell, Gdk } = imports.gi;
const DND = imports.ui.dnd;
const Cairo		 = imports.cairo;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

var calendar = GObject.registerClass(
class calendarWidgets extends St.BoxLayout {
		_init() {
			super._init({
				reactive: true,
			});
	    this.weekdayAbbr = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    	this._weekStart = Shell.util_get_week_start();
			this._Months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
			this._settings = ExtensionUtils.getSettings();
			
			this._calendar = new St.Widget({
						style_class: 'calendar-wd',
            layout_manager: new Clutter.GridLayout(),
            reactive: true,
			});

			this._settings.connect('changed::hide-calendar-widget', () => this._toggleShow());
			this._settings.connect('changed::calendar-location', () => this.setPosition());

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
			if(!this._settings.get_boolean('hide-calendar-widget'))
				this.add_child(this._calendar);

			this._buildHeader();
      this._update();
		}

		_buildHeader(){
        // Top line of the calendar '<| September 2009 |>'
        this._topBox = new St.BoxLayout({ 
        });
        this._calendar.layout_manager.attach(this._topBox, 0, 0, 7, 1);
        
        this._monthLabel = new St.Label({
        		style_class: 'calendar-header-label',
            can_focus: true,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._topBox.add_child(this._monthLabel);

        // Add weekday labels...
        for (let i = 0; i < 7; i++) {
            let label = new St.Label({
            		style_class: 'weekday-label',
                text: this.weekdayAbbr[i],
            });
            this._calendar.layout_manager.attach(label, i, 1, 1, 1);
        }

        // All the children after this are days, and get removed when we update the calendar
        this._firstDayIndex = this._calendar.get_n_children();
		}

		_update(){
			this._selectedDate = new Date();
		  this._monthLabel.text = this.getMonthsName(this._selectedDate.getMonth());
			let now = new Date();
			let children = this._calendar.get_children();
      for (let i = this._firstDayIndex; i < children.length; i++)
          children[i].destroy();

      this._buttons = [];

			let totalDays = this._daysInMonth(this._selectedDate.getMonth(),this._selectedDate.getFullYear());

			let firstDay = new Date(this._selectedDate.getFullYear(),this._selectedDate.getMonth(),1);

			let row = 2;
			for(let i=0;i<totalDays;i++){
				let dateLabel = new St.Button({
					label: firstDay.toLocaleFormat('%d'),
				});

				let styleClass = 'day-base'
				
				if(this.sameDay(now,firstDay)) {
					styleClass += ' today'
				}

				dateLabel.style_class = styleClass;

				this._calendar.layout_manager.attach(dateLabel,firstDay.getDay(),row,1,1);
				
				if(firstDay.getDay() == 6){
					row++;}
				firstDay.setDate(firstDay.getDate() + 1);
			}
		}
		
		_daysInMonth(month,year){
      let d = new Date(year, month+1, 0);
      return d.getDate();
		}

		sameDay(dateA, dateB) {
	    return dateA.getYear() == dateB.getYear() && (dateA.getMonth() == dateB.getMonth()) && (dateA.getDate() == dateB.getDate());
		}

		getMonthsName(date) {
			return this._Months[date];
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

        let [x, y] = this._settings.get_value('calendar-location').deep_unpack();
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
            this._settings.set_value('calendar-location', new GLib.Variant('(ii)', [x, y]));
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
        this._settings.set_value('calendar-location', new GLib.Variant('(ii)', [this.deltaX, this.deltaY]));
        this.ignoreUpdatePosition = false;
    }

    getDragActor() {
    }

    getDragActorSource() {
        return this;
    }
});
