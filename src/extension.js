const {GLib} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Me = ExtensionUtils.getCurrentExtension();
const Clock = Me.imports.circleClock.Clock;
const Ram = Me.imports.circleRam.Ram;
const Cpu = Me.imports.circleCpu.Cpu;
const Calendar = Me.imports.calendarWidgets.calendar;
const NetSpeed = Me.imports.circleNetSpeed.NetSpeed;

let timeoutId,settings;
var clock;
var ram;
var cpu;
var calendar;
var netSpeed;

function init() {
}

function enable() {
	settings = ExtensionUtils.getSettings();
	clock = new Clock()
	cpu = new Cpu();
	ram = new Ram();
	calendar = new Calendar();
	netSpeed = new NetSpeed();
	Main.layoutManager._backgroundGroup.add_child(clock);
	Main.layoutManager._backgroundGroup.add_child(cpu);
	Main.layoutManager._backgroundGroup.add_child(ram);
	Main.layoutManager._backgroundGroup.add_child(calendar);
	Main.layoutManager._backgroundGroup.add_child(netSpeed);
	timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
		clock.update();
		cpu.update();
		ram.update();
		calendar._update();
		netSpeed.update();
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
	Main.layoutManager._backgroundGroup.remove_child(calendar);
	Main.layoutManager._backgroundGroup.remove_child(netSpeed);
	clock = null;
	cpu = null;
	ram = null;
	calendar = null;
	netSpeed = null;
}
