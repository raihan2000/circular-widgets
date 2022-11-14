const {St,Clutter,GObject,Shell,GLib,Gio} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Cairo = imports.cairo;
const Me = ExtensionUtils.getCurrentExtension();
const Clock = Me.imports.circleClock.Clock;
const Ram = Me.imports.circleRam.Ram;
const Cpu = Me.imports.circleCpu.Cpu;

var clock;
var ram;
var cpu;
var settings = ExtensionUtils.getSettings();

function init() {
	clock = new Clock()
	cpu = new Cpu();
	ram = new Ram();
}

function enable() {
	Main.layoutManager._backgroundGroup.add_child(clock);
	Main.layoutManager._backgroundGroup.add_child(cpu);
	Main.layoutManager._backgroundGroup.add_child(ram);
	timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
		clock.update();
		cpu.update();
		ram.update();
		return GLib.SOURCE_CONTINUE;
	});
}

function disable() {
	if (timeoutId) {
		GLib.Source.remove(timeoutId);
		timeoutId = null;
	}
	Main.layoutManager._backgroundGroup.remove_child(clock);
	Main.layoutManager._backgroundGroup.remove_child(cpu);
	Main.layoutManager._backgroundGroup.remove_child(ram);
}
