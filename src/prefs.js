'use strict';

const { Adw, Gio, Gtk, Gdk } = imports.gi;
const Params = imports.misc.params;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function fillPreferencesWindow(window) {
	let prefs = new PrefsWindow(window);
	prefs.fillPrefsWindow();
}

class PrefsWindow {
		constructor(window) {
			this._window = window;
			this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.circular');
		}
	
		// create a new Adw.PreferencesPage and add it into this.window
  	create_page(title) {
  		let page = new Adw.PreferencesPage({
    		title: title,
    	  //icon_name: icon,
    	});
    	this._window.add(page);

    	// get the headerbar
    	if (!this.headerbar) {
    		let pages_stack = page.get_parent(); // AdwViewStack
    	  let content_stack = pages_stack.get_parent().get_parent(); // GtkStack
    	  let preferences = content_stack.get_parent(); // GtkBox
    	  this.headerbar = preferences.get_first_child(); // AdwHeaderBar
    }

    return page;
    }
    
    // create a new Adw.PreferencesGroup and add it to a prefsPage
    create_group(page,title) {
    	let group;
    	if(title !== undefined){
    			group = new Adw.PreferencesGroup({
      		title: title,
        	/*margin_top: 5,
        	margin_bottom: 5,*/
      	});
      }	else{
    		group = new Adw.PreferencesGroup();
    	}
      page.add(group);
      return group;
    }
    
    append_row(group, title, widget) {
        let row = new Adw.ActionRow({
            title: title,
        });
        group.add(row);
       	row.add_suffix(widget);
       	row.activatable_widget = widget;
    }
    
    append_rows(group, title, wd1, wd2) {
        let row = new Adw.ActionRow({
            title: title,
        });
        group.add(row);
        let label1 = new Gtk.Label();
        label1.set_label('FG');
        row.add_suffix(label1);
        let space = new Gtk.Label();
        space.set_label(' ');
        row.add_suffix(space);
       	row.add_suffix(wd1);
       	row.activatable_widget = wd1;
       	let space1 = new Gtk.Label();
        space1.set_label(' ');
        row.add_suffix(space1);
        let label2 = new Gtk.Label();
        label2.set_label('BG');
        row.add_suffix(label2);
        let space2 = new Gtk.Label();
        space2.set_label(' ');
        row.add_suffix(space2);
       	row.add_suffix(wd2);
       	row.activatable_widget = wd2;
    }
    
    // create a new Adw.ActionRow to insert an option into a prefsGroup
    append_switch(group, title, key) {      
      let button = new Gtk.Switch({
        active: key,
        valign: Gtk.Align.CENTER,
    	});
      
      this._settings.bind(
        key,
        button,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    	);
			this.append_row(group, title, button);
		}
    
  	append_spin_button(group,	title, is_double, key, min, max, step) {

        let v = 0;
        if (is_double) {
            v = this._settings.get_double(key);
        } else {
            v = this._settings.get_int(key);
        }
        let spin = Gtk.SpinButton.new_with_range(min, max, step);
        spin.set_value(v);
        this._settings.bind(key, spin, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.append_row(group, title, spin);
    }
    
    append_color_button(group, title, key, color) {
        		let rgba = new Gdk.RGBA();
        		rgba.parse(color);
        		let colorButton = new Gtk.ColorButton({
        	    	rgba,
        	    	use_alpha: true,
        	    	valign: Gtk.Align.CENTER
        		});
        		colorButton.connect('color-set', (widget) => {
        			this._settings.set_string(key, widget.get_rgba().to_string());
        		});
        		this.append_row(group,title,colorButton);
    }

		append_scale_bar(group,title,key,prop) {
			prop = Params.parse(prop, {
            min: 0,
            max: 100,
            step: 10,
            mark_position: 0,
            add_mark: false,
            size: 200,
            draw_value: true
        });

				let bar = Gtk.Scale.new_with_range(0,prop.min,prop.max,prop.step);
        bar.set_value(this._settings.get_int(key));
        bar.set_draw_value(prop.draw_value);
				bar.set_size_request(prop.size, -1);
        if(prop.add_mark) {
            bar.add_mark(
                prop.mark_position,
                Gtk.PositionType.BOTTOM,
                null
            );
        }
				bar.connect('value-changed', (slider) => {
        	this._settings.set_int(key, slider.get_value())});
				this.append_row(group,title,bar);
		}

		append_font_chooser(group,title,key) {
			let chooser = new Gtk.FontButton({
				valign: Gtk.Align.CENTER
			});
			chooser.connect('font-set', (widget) => {
      	this._settings.set_string(key, widget.get_font().to_string());
      });
			this.append_row(group,title,chooser);
		}

		append_info_group(group,name,title) {
			let adw_group = new Adw.PreferencesGroup();
			let infoBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false
      });
      
      let name_label = new Gtk.Label({
      label: name,
      });
      
      let version = new Gtk.Label({
      	label: 'Version: ' + title,
      });
      
      infoBox.append(name_label);
      infoBox.append(version);
      adw_group.add(infoBox);
      group.add(adw_group);
		}

    fillPrefsWindow() {
    	let clockWidget = this.create_page('Clock');
    	{
    		let groupClock = this.create_group(clockWidget);
    		this.append_switch(groupClock,'Hide Clock','hide-clock-widget');
    		this.append_scale_bar(groupClock,'Size', 'circular-clock-size',{min: 100,max: 200,step: 1,mark_position: 100,add_mark: true,size: 150,draw_value: true});
    		this.append_switch(groupClock, 'Enable Sweeping Motion', 'sweeping-motion-clock')

    		let groupClockRing = this.create_group(clockWidget,'Clock Ring');
				this.append_switch(groupClockRing,'Hide Second Ring','clock-sec-ring');
				this.append_spin_button(groupClockRing,'Second Ring Radius',true,'clock-sec-ring-radius',1,99.5,0.1);
				this.append_spin_button(groupClockRing,'Second Ring Width',true,'clock-sec-ring-width',1,15,0.1);
    		this.append_color_button(groupClockRing,'Second Ring Color','clock-sec-color',this._settings.get_string('clock-sec-color'));
				this.append_switch(groupClockRing,'Hide Minute Ring','clock-min-ring');
				this.append_spin_button(groupClockRing,'Minute Ring Radius',true,'clock-min-ring-radius',1,99.5,0.1);
				this.append_spin_button(groupClockRing,'Minute Ring Width',true,'clock-min-ring-width',1,15,0.1);
    		this.append_color_button(groupClockRing,'Minute Ring Color','clock-min-color',this._settings.get_string('clock-min-color'));
				this.append_switch(groupClockRing,'Hide Hour Ring','clock-hour-ring');
				this.append_spin_button(groupClockRing,'Hour Ring Radius',true,'clock-hour-ring-radius',1,99.5,0.1);
				this.append_spin_button(groupClockRing,'Hour Ring Width',true,'clock-hour-ring-width',1,15,0.1);
    		this.append_color_button(groupClockRing,'Hour Ring Color','clock-hour-color',this._settings.get_string('clock-hour-color'));
//    		this.append_spin_button(groupClockRing,'Line Width',false,'clock-line-width',1,15,1);
//    		this.append_switch(groupClockRing,'Show Inner Circle','clock-inner-circle');
    		
    		let groupClockHand = this.create_group(clockWidget,'Clock Hand');
				this.append_switch(groupClockHand,'Hide Second Hand','clock-sec-hand');
				this.append_spin_button(groupClockHand,'Second Hand Height',true,'clock-sec-hand-height',1,100,0.1);
				this.append_spin_button(groupClockHand,'Second Hand Width',true,'clock-sec-hand-width',1,10,0.1);
				this.append_color_button(groupClockHand,'Second Hand Color','clock-sec-hand-color',this._settings.get_string('clock-sec-hand-color'));
				this.append_switch(groupClockHand,'Hide Minute Hand','clock-min-hand');
				this.append_spin_button(groupClockHand,'Minute Hand Height',true,'clock-min-hand-height',1,100,0.1);
				this.append_spin_button(groupClockHand,'Minute Hand Width',true,'clock-min-hand-width',1,10,0.1);
				this.append_color_button(groupClockHand,'Minute Hand Color','clock-min-hand-color',this._settings.get_string('clock-min-hand-color'));
				this.append_switch(groupClockHand,'Hide Hour Hand','clock-hour-hand');
				this.append_spin_button(groupClockHand,'Hour Hand Height',true,'clock-hour-hand-height',1,100,0.1);
				this.append_spin_button(groupClockHand,'Hour Hand Width',true,'clock-hour-hand-width',1,10,0.1);
				this.append_color_button(groupClockHand,'Hour Hand Color','clock-hour-hand-color',this._settings.get_string('clock-hour-hand-color'));
				
    		let groupClockText = this.create_group(clockWidget,'Clock Text');
    		this.append_switch(groupClockText, 'Disable 12 hour Clock', 'am-or-pm-clock');
    		this.append_switch(groupClockText, 'Hide Text Clock', 'text-clock');
    		this.append_color_button(groupClockText,'Text Color','clock-text-color',this._settings.get_string('clock-text-color'));

//    		this.append_font_chooser(groupClock,'Text Font','clock-text-font');
    	}

    	let cpuWidget = this.create_page('CPU');
    	{
    		let groupCpu = this.create_group(cpuWidget);
    		this.append_switch(groupCpu,'Hide CPU','hide-cpu-widget');
    		this.append_scale_bar(groupCpu,'Size', 'circular-cpu-size',{min: 80,max: 250,step: 1,mark_position: 100,add_mark: true,size: 200,draw_value: true});
    		this.append_spin_button(groupCpu,'Line Width',false,'cpu-line-width',1,125,1);
    		this.append_switch(groupCpu,'Show Inner Circle','cpu-inner-circle');
    		this.append_color_button(groupCpu,'CPU Ring','cpu-line-color',this._settings.get_string('cpu-line-color'));
//    		this.append_font_chooser(groupCpu,'Text Font','cpu-text-font');
    		this.append_color_button(groupCpu,'Text Color','cpu-text-color',this._settings.get_string('cpu-text-color'));
    	}

    	let ramWidget = this.create_page('RAM');
    	{
    		let groupRam = this.create_group(ramWidget);
    		this.append_switch(groupRam,'Hide RAM','hide-ram-widget');
    		this.append_scale_bar(groupRam,'Size', 'circular-ram-size',{min: 80,max: 250,step: 1,mark_position: 100,add_mark: true,size: 200,draw_value: true});
    		this.append_spin_button(groupRam,'Line Width',false,'ram-line-width',1,125,1);
    		this.append_switch(groupRam,'Show Inner Circle','ram-inner-circle');
    		this.append_color_button(groupRam,'RAM Ring','ram-line-color',this._settings.get_string('ram-line-color'));
//    		this.append_font_chooser(groupRam,'Text Font','ram-text-font');
    		this.append_color_button(groupRam,'Text Color','ram-text-color',this._settings.get_string('ram-text-color'));
    	}

			let calendarWidget = this.create_page('Calendar');
			{
				let groupCalendar = this.create_group(calendarWidget);
    		this.append_switch(groupCalendar,'Hide Calendar','hide-calendar-widget');
			}

    	let aboutPage = this.create_page('About');
    	{
    		let groupAbout = this.create_group(aboutPage);
    		this.append_info_group(groupAbout,Me.metadata.name,
    			Me.metadata.version.toString());
    	}
    }
}
