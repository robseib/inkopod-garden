let energy = 0; // base currency
let calories = 0; // 100th of an energy, to allow for rapid display
let idle_date = 0; // zero or the date you went into idle mode
let save_date = new Date().getTime(); // the moment last saved, in ms since epoch
let epc = 1; // energy per click (manual gain) // TO REMOVE
let unlocked = 1; // the absolute number of unit types unlocked, starts at 1
let units = []; // total units of each type
let upgrades = []; // unit upgrades purchased
let messages = []; // a queue of messages
let missions = []; // array of Mission objects
const mission_freq = 1000 * 60 * 30; // 30 min to generate a mission
const missions_max = 6; // max number of missions
const counter = [0,1,2,3,4,5,6,7,8]; // # of types, just makes loops easier to write
const screens = ["upgrades", "missions", "settings"];
const colors = ["#00ffff", "#f500f5", "#f2f200", "#00ff00", "#0000f5", "#f20000", "#00f5ab", "#7a00f5", "#f27a00"];
const names = ["Cyan", "Magenta", "Yellow", "Green", "Blue", "Red", "Teal", "Purple", "Orange"];

class Mission {
	constructor(state, min_recruits, max_loss, max_time, committ, end_date) {
		this.state = state; //["ready", "accepted", "completed"]
		this.min_recruits = min_recruits;
		this.max_loss = max_loss;
		this.max_time = max_time;
		this.committ = committ;
		this.end_date = end_date;
	}
	accept() {
		if ((this.state == 0) && (this.get_recruits() <= get_available())) {
			this.end_date = (new Date().getTime() + this.get_time());
			this.state = 1;
		}
	}
	progress() {
		if ((this.state == 1) && (new Date().getTime() >= this.end_date)) {
				this.state = 2;
		}
	}
	recruit(mod) {this.committ = mod;}
	complete(array_id) {
		let reward = Math.ceil((get_eps() * (this.max_time / 1000)) + (get_average_cost() * this.max_loss));
		adjust_energy(reward);
		let actual_loss = get_random(1, this.get_loss());
		let decrement = actual_loss;
		while (decrement >= 1) {
			let target = ((get_weighted_random(Math.ceil(unlocked / 3)) - 1) * 3) + get_random(0, 2);
			if (units[target] >= 1) {
				adjust_unit(target, -1);
				decrement--;
			}
		}
		let message = "You completed a mission! <br>Reward: <i class='fas fa-bolt'></i> " + display_num(reward) + " <br>Losses: <i class='fas fa-skull'></i> " + actual_loss;
		if (get_random(1, unlocked*2) == 1) { // roll the dice between 1 and double-unlocked, need a 1 to pass
			message += "<br><br>You discovered a new type of Inkopod: " + names[unlocked];
			unlocked++;
		}
		display_message(message);
		missions.splice(array_id, 1);
	}
	get_recruits() {return (this.min_recruits * this.committ);}
	get_time() {
		let time = 0;
		if (this.state == 0) {time = Math.ceil(this.max_time / this.committ);}
		if (this.state == 1) {time = this.end_date - new Date().getTime();}
		return Math.max(time, 0);
	}
	get_loss() {return Math.ceil(this.max_loss / this.committ);}
}

/***************************/
/*       INITIALIZE        */
/***************************/

if (get_cookie_num("save_date") == "") {
	for (i in counter) {
		units[i] = 0; 
		upgrades[i] = 0;
	}
	generate_mission();
} else {
	load();
}
update_missions();
switch_screen("upgrades");

// TESTING
/*
energy = 1000;
unlocked = 6;
units[0] = 12;
generate_mission();
generate_mission();
*/

/***************************/
/*     AUTOMATIC TIMING    */
/***************************/

setInterval(function centosecond() {
	if (document.visibilityState == "hidden") {
		if (idle_date == 0) {idle_date = new Date();}
	} else {
		if (idle_date != 0) {
			update_energy(idle_date);
			idle_date = 0;
		}
		if (calories >= 100) {
			adjust_energy(1);
			calories -= 100;
		} else {
			calories += (get_eps());
		}
		// update the energy display only
		document.getElementById("energy").innerHTML = "<h1><i class='fas fa-bolt fa-lg'></i> " + display_num(energy) + "</h1>";
	}
}, 10);

setInterval(function decosecond() {
	display(); // update the rest of the display
}, 100);

setInterval(function minute() {
	update_missions();
	save();
}, 60000);

/***************************/
/*        FUNCTIONS        */
/***************************/

function update_missions() {
	// generate new missions
	let now = new Date().getTime();
	let elapsed = now - save_date;
	if (elapsed > mission_freq) {
		let blocks = Math.floor(elapsed / mission_freq);
		for (let i = 0; i < blocks; i++) {generate_mission();}
	}
	// progress active missions
	for (let i in missions) {missions[i].progress();}
}

function generate_mission() {
	if (missions.length < missions_max) {
		let state = 0;
		let min_recruits = 2;//TESTING get_random(Math.max(Math.ceil(get_population() / 6), 1), get_population() + 6);
		let max_loss = 2;//TESTING get_random(1, Math.min(min_recruits, 6));
		let max_time = 0;//TESTING get_random(3600000, 3600000*12);
		let committ = 1;
		let end_date = 0;
		missions.push(new Mission(state, min_recruits, max_loss, max_time, committ, end_date));
	}
}

function update_energy(since) { // update energy value when returning from idle mode or loading game
	let now = new Date().getTime();
	let missing_energy = get_eps() * Math.ceil((now - since) / 1000);
	if (missing_energy != null) {
		adjust_energy(missing_energy);
		display_message("You earned " + display_num(missing_energy) + " <i class='fas fa-bolt'></i> while away!");
	}
}

function save() { // save game to cookies
	let days = 365;
	save_date = new Date().getTime();
	set_cookie("energy", energy, days);
	set_cookie("unlocked", unlocked, days);
	set_cookie("save_date", save_date, days);
	for (let i in counter) {
		set_cookie("unit" + i, units[i], days);
		set_cookie("upgrade" + i, upgrades[i], days);
	}
	for (let i in missions) {
		set_cookie("mission" + i + "state", missions[i].state, days);
		set_cookie("mission" + i + "min_recruits", missions[i].min_recruits, days);
		set_cookie("mission" + i + "max_loss", missions[i].max_loss, days);
		set_cookie("mission" + i + "max_time", missions[i].max_time, days);
		set_cookie("mission" + i + "committ", missions[i].committ, days);
		set_cookie("mission" + i + "end_date", missions[i].end_date, days);
	}
}

function load() { // load game from cookies
	energy = get_cookie_num("energy");
	save_date = get_cookie_num("save_date");
	for (let i in counter) {
		units[i] = get_cookie_num("unit" + i);
		upgrades[i] = get_cookie_num("upgrade" + i);
		if (get_cookie_num("type" + i) == 1) {unlocked = (i + 1);} // temp
		wipe_cookie("type" + i); // temp
	}
	if (get_cookie_num("unlocked") != 0) {unlocked = get_cookie_num("unlocked");} // temp if check
	for (let i = 0; i < missions_max; i++) {
		let min_recruits = get_cookie_num("mission" + i + "min_recruits");
		if (min_recruits > 0) {
			missions.push(new Mission(
				get_cookie_num("mission" + i + "state"), 
				min_recruits,
				get_cookie_num("mission" + i + "max_loss"), 
				get_cookie_num("mission" + i + "max_time"), 
				get_cookie_num("mission" + i + "committ"), 
				get_cookie_num("mission" + i + "end_date"))
			);
		}
	}
	update_energy(save_date);
}

function delete_save() {
	if (confirm("Do you want to delete your progress and start over?")) {
		wipe_cookie("energy");
		wipe_cookie("unlocked");
		wipe_cookie("save_date");
		for (let i in counter) {
			wipe_cookie("unit" + i);
			wipe_cookie("upgrade" + i);
		}
		for (let i = 0; i < missions_max; i++) {
			wipe_cookie("mission" + i + "state");
			wipe_cookie("mission" + i + "min_recruits");
			wipe_cookie("mission" + i + "max_loss");
			wipe_cookie("mission" + i + "max_time");
			wipe_cookie("mission" + i + "committ");
			wipe_cookie("mission" + i + "end_date");
		}
		location.reload();
		return true;
	}
	return false;
}

function export_save() { // version 1 stores 9 types and 6 missions
	let str = "v1," + energy + "," + unlocked + "," + save_date + ",";
	for (let i = 0; i < 9; i++) {
		str += units[i] + ","; 
		str += upgrades[i] + ",";
	}
	for (let i = 0; i < 6; i++) {
		try {str += missions[i].state + ",";} catch {str += ",";}
		try {str += missions[i].min_recruits + ",";} catch {str += ",";}
		try {str += missions[i].max_loss + ",";} catch {str += ",";}
		try {str += missions[i].max_time + ",";} catch {str += ",";}
		try {str += missions[i].committ + ",";} catch {str += ",";}
		try {str += missions[i].end_date + ",";} catch {str += ",";}
	}
	str = window.btoa(str);
	display_message(`
		Copy and paste somewhere safe:
		<input type="text" id="savestring" class="textbox" value="${str}">
		<button type="button" onclick="copy_text('savestring')">Copy</button>
	`, "Cancel");
}

function import_prompt() {
	display_message(`
		This will overwrite the current game. Paste the text you exported earlier: 
		<input type="text" id="loadstring" class="textbox" value="">
		<button type="button" onclick="import_save(copy_text('loadstring'))">Import</button>
	`);
}

function import_save(str) { // version 1
	//let str = prompt("This will overwrite the current game. Paste the text you exported earlier using Export Save: ");
	str = window.atob(str);
	if (str != null) {
		let ar = str.split(",");
		for (i in ar) {if (ar[i] != "" && ar[i] != "v1") {ar[i] = Number(ar[i]);}}
		// version string at ar[0]
		energy = ar[1];
		unlocked = ar[2];
		save_date = ar[3];
		let index = 4;
		for (let i = 0; i < 9; i++) {
			units[i] = ar[index];
			index++;
			upgrades[i] = ar[index];
			index++;
		}
		missions = [];
		for (let i = 0; i < 6; i++) { // missions
			if (typeof ar[index] == "number") {
				missions.push(new Mission(ar[index],ar[index+1],ar[index+2],ar[index+3],ar[index+4],ar[index+5]));
			}
			index += 6;
		}
		save();
	}
	close_message();
}

function set_cookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function wipe_cookie(cname) {
	document.cookie = cname + "=;" + 0 + ";path=/";
}

function get_cookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(';');
	for(let i = 0; i <ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function get_cookie_num(cname) {
	let value = get_cookie(cname);
	if (value != "") {return Number(value);}
	return 0;
}

function copy(text) {navigator.clipboard.writeText(text);}

function copy_text(id) { // copies to clipboard from a text box, and returns the text
	let textbox = document.getElementById(id);
	textbox.select();
	textbox.setSelectionRange(0, 99999); // for mobile devices
	copy(textbox.value);
	return textbox.value;
}

function adjust_energy(value) {
	if ((energy + value) >= 0) {energy += value};
}

function adjust_unit(type, amount) {
	if ((units[type] + amount) >= 0) {units[type] += amount;}
}

function buy_unit(type) {
	let cost = get_unit_cost(type);
	if (energy >= cost) { // check affordable
		if (get_level(type) == 0) { // primary units are simple
			adjust_unit(type, 1);
			adjust_energy(-cost);
		} else if (get_available() > 0) { // other units morph from primaries and must not go into negatives
			let morph1 = type - 3;
			let morph2;
			if (get_level(type) == 1) {morph2 = (type - 1) % 3;} 
			if (get_level(type) == 2) {morph2 = (type - 6);}
			if (units[morph1] && units[morph2]) {
				adjust_unit(type, 1);
				adjust_unit(morph1, -1);
				adjust_unit(morph2, -1);
				adjust_energy(-cost);
			}
		}
	}
}

function buy_upgrade(type) {
	let cost = get_upgrade_cost(type);
	if (energy >= cost) {
		energy -= cost;
		upgrades[type] += 1;
	}
}

function convert_range(old_value, old_min, old_max, new_min, new_max) {
	let old_range = old_max - old_min;
	let new_range = new_max - new_min;
	return (((old_value - old_min) * new_range) / old_range) + new_min;
}

function get_level(type) {return Math.floor(type / 3);} // zero and up

function get_unit_cost(type) {
	return Math.round((1 + (units[type] ** 3)) * 5);
}

function get_average_cost() {
	let avg = get_unit_cost(0);
	for (let i = 0; i < unlocked; i++) {
		avg = (avg + get_unit_cost(i)) / 2;
	}
	return Math.round(avg);
}

function get_population() {
	let pop = 0;
	for (let i in counter) {
		pop += units[i];
	}
	return pop;
}

function get_available() { // units not tied up in missions
	let unavailable = 0;
	for (let i in missions) {
		if (missions[i].state >= 1) {unavailable += missions[i].get_recruits();}
	}
	return get_population() - unavailable;
}

function get_eps() { // energy per second
	let eps = 1;
	for (let i in counter) {eps += (get_type_eps(i));}
	return eps;
}

function get_type_eps(type) {
	return Math.round(units[type] * (get_level(type) + 1) * ((get_level(type) * 0.5) + 1) *	(1 + (upgrades[type] * 0.1)));
}

function get_upgrade_cost(type) {
	return (1 + (upgrades[type] ** 3)) * 5000;
}

function get_random(min, max) {
	return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function get_weighted_random(max) { // a basic weighted random from 1 to a max
  return Math.round(max / (Math.random() * max + 1));
}

function ms_to_min(ms) {return Math.round(ms / 60000);}
function ms_to_hr(ms) {return Math.round(ms / 360000) / 10;}

/***************************/
/*         DISPLAY         */
/***************************/

function switch_screen(screen) { // displays both the screen and the menu items
	for (let s of screens) {
		document.getElementById(s).style.display = "none";
		document.getElementById("menu-"+s).classList.remove("menu-selected");
		document.getElementById("menu-"+s).style.display = "inline-block";
	}
	document.getElementById(screen).style.display = "inline-block";
	document.getElementById("menu-"+screen).classList.add("menu-selected");
}

function display() { // updates all display
	
	// main variables (note that energy is in the timer functions)
	document.getElementById("population").innerHTML = `<i class="fas fa-heart"></i> ` + get_available() + " / " + get_population();

	// display missions
	let missions_screen = document.getElementById("missions");
	missions_screen.textContent = "";
	// missions introduction
	let intro = document.createElement("h2");
	intro.innerHTML = `Send Inkopods on Missions to discover stuff! <i class="fas fa-circle-question" onclick="display_helper(0)"></i>`;
	missions_screen.appendChild(intro);
	for (let i in missions) { // for each mission
		let div = document.createElement("div");
		let mission = missions[i];
		let info = `<i class="fas fa-heart"></i> ${mission.get_recruits()} <i class="fas fa-skull"></i> ${mission.get_loss()} <i class="fas fa-clock"></i> ${ms_to_min(mission.get_time())} min.`;
		let buttons = "";
		switch (mission.state) {
			case 0: // ready
				for (let x = 1; x <= 3; x++) { // committ buttons
					let idd = ""; 
					if (x == missions[i].committ) {idd = `id="committ"`}
					buttons += `<div ${idd} class="button" onclick="missions[${i}].recruit(${x})">${x}x</div>`;
				}
				buttons += `
					<div class="button" onclick="missions[${i}].accept()"><i class="fas fa-circle-check"></i></div>`;
				break;
			case 1: // accepted
				info = `<i class="fas fa-spinner fa-spin"></i> ${info}`;
				break;
			case 2: //completed
				info = `<i class="fas fa-circle-check"></i> ${info}`;
				div.onclick = function (){missions[i].complete(i)};
				break;
		}

		div.id = "mission" + i;
		div.classList = "mission";
		div.innerHTML = `
			<h2>${info}</h2>
			<div class="flexbox mission-buttons">${buttons}</div>`;
		missions_screen.appendChild(div);
	}

	// display upgrades
	let upgrades_screen = document.getElementById("upgrades");
	upgrades_screen.textContent = "";
	for (let i = 0; i < unlocked; i++) {
		let div = document.createElement("div");
		div.id = "type" + i;
		div.style.borderColor = colors[i];
		div.classList = "flexbox upgrade";
		div.innerHTML = `
			<h1 class="flex1">${names[i]} (${units[i]})</h1>
			<button class="flex0" type="button" onclick="buy_unit(${i})">
				<i class='fas fa-seedling'></i> ${display_num(get_unit_cost(i))} <i class='fas fa-bolt'></i>
			</button>
			<button class="flex0" type="button" onclick="buy_upgrade(${i})">
				<i class='fas fa-circle-up'></i> ${display_num(get_upgrade_cost(i))} <i class='fas fa-bolt'></i>
			</button>
			<h1><i class="fas fa-circle-question flex0" onclick="display_desc(${i})"></i></h1>
		`;
		upgrades_screen.appendChild(div);
	}

}

function display_num(num) {
	if (num < 1000) {
		num = Math.trunc(num);
	} else {
		let tier = 0;
		while (num >= 1000) {
			num /= 1000;	
			tier++;
		}
		num = Math.trunc(num * 10) / 10;
		switch (tier) {
			case 1: num += " Th."; break;
			case 2: num += " Mi."; break;
			case 3: num += " Bi."; break;
			case 4: num += " Tr."; break;
		}
	}
	return num; // can use .toLocaleString() if we want bigger display;
}

function display_message(message) {
	if (message != messages[0]) {messages.push(message);}
	let div = document.getElementById("message");
	div.innerHTML = `<i class="fas fa-circle-xmark" id="close-message" onclick="close_message()"></i><p>${messages[0]}</p>`;
	div.style.display = "block";
}

function close_message() {
	messages.shift(0); // delete the current message
	if (messages.length == 0) { // if queue empty, hide div
		let div = document.getElementById("message");
		div.innerHTML = "";
		div.style.display = "none";
	} else { // otherwise, display next
		display_message(messages[0]);
	}
}

function display_helper(num) {
	let message = "";
	switch (num) {
		case 0: // mission helper
			message = `
				<h2>Missions</h2>
				<p><i class="fas fa-heart"></i> Required number of Inkopods to start the mission.</p>
				<p><i class="fas fa-skull"></i> Maximum number of Inkpods you may lose.</p>
				<p><i class="fas fa-clock"></i> Number of minutes to complete the mission.</p>
				<p>Send 1x, 2x, or 3x the required number to reduce the total loss and time.</p>
				<p>Tap the <i class="fas fa-circle-check"></i> to start the mission!</p>
			`;
			break;
	}
	display_message(message);
}

function display_desc(num) {
	const descriptions = [
		"Cyan Inkopods have the power of Ice!", 
		"Magenta Inkopods have the power of fire!", 
		"Yellow Inkopods have the power of Acid!", 
		"Green Inkopods are a mix of Cyan and Yellow, and have the ability to fly!", 
		"Blue Inkopods are a mix of Cyan and Magenta, and are super strong.", 
		"Red Inkopods are a mix of Magenta and Yellow, and are super fast!"
	];
	let message = descriptions[num];
	message += `<br><br>You have ${units[num]} ${names[num]} Inkopods, collecting ${get_type_eps(num)} <i class='fas fa-bolt'></i> per second (includes +${upgrades[num] * 10}% from upgrades).`;
	display_message(message);
}

function set_var(variable, value) { // css variables
	let r = document.querySelector(':root');
  r.style.setProperty(variable, value);
}

function color_scheme(num) {
	switch (num) {
		case 0:
			set_var("--c1", "hsl(188,80%,40%)");
			set_var("--c2", "hsl(188,80%,40%)");
			set_var("--cbg", "hsl(188,80%,20%)");
			break;
		case 1:
			set_var("--c1", "hsl(316,80%,40%)");
			set_var("--c2", "hsl(316,80%,40%)");
			set_var("--cbg", "hsl(316,80%,20%)");
			break;
		default:
			set_var("--c1", "hsl(90,50%,40%)");
			set_var("--c2", "hsl(190,50%,40%)");
			set_var("--cbg", "hsl(90,50%,20%)");
	}
}