let updated = 0; // date of the last time values were updated
let food = 0; // new action currency
let messages = []; // a queue of message strings
let missions = []; // array of mission objects
const Screens = ["units", "missions", "messages", "settings"];

/***************************/
/*       INITIALIZE        */
/***************************/

let cookie_savestring = get_cookie("savestring");

if (cookie_savestring == "") { 
	// if save file does not exist, start a new session:
	generate_mission();
	food = 10;
	updated = Date.now();
	display();
} else { 
	// if save file exists, load it:
	load(cookie_savestring);
}
switch_screen("units");

// TESTING
/*
food = 1000;
units[0] = 40;
generate_mission();
generate_mission();
*/

/****************************/
/*      MAIN FUNCTIONS      */
/****************************/

setInterval(function every_minute() {
	save(); // save game (which also runs update())
}, 60000);

function update() { // update main variables
	
	let now = Date.now();
	let elapsed = now - updated;
	
	// collect more food
	let gained = inkopod.production * (elapsed / 60000);
	if (gained != null) {update_food(gained);}

	// generate new missions
	if (elapsed > mission.frequency) {
		let blocks = Math.floor(elapsed / mission.frequency);
		for (let i = 0; i < blocks; i++) {generate_mission();}
	}
	// progress active missions
	for (let i in missions) {missions[i].progress();}

	updated = now;

	display();
}

// create a mission object and add to array
function generate_mission() {
	if (missions.length < mission.maximum) {
		let state = 0;
		let min_recruits = get_random(Math.max(Math.ceil(inkopod.population / 6), 1), inkopod.population + 6);
		let max_loss = get_random(1, Math.min(min_recruits, 6));
		let max_time = get_random(3600000, 3600000*12);
		let committ = 1;
		let end_date = 0;
		missions.push(new mission(state, min_recruits, max_loss, max_time, committ, end_date));
	}
}

function update_food(value) {
	if ((food + value) >= 0) {food += value};
}

/***************************/
/*         HELPERS         */
/***************************/

function copy(text) {navigator.clipboard.writeText(text);}

function copy_text(id) { // copies to clipboard from a text box, and returns the text
	let textbox = document.getElementById(id);
	textbox.select();
	textbox.setSelectionRange(0, 99999); // for mobile devices
	copy(textbox.value);
	return textbox.value;
}

function convert_range(old_value, old_min, old_max, new_min, new_max) {
	let old_range = old_max - old_min;
	let new_range = new_max - new_min;
	return (((old_value - old_min) * new_range) / old_range) + new_min;
}

function get_random(min, max) { // random integer between min and max
	return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function get_weighted_random(max) { // random integer between 1 and max, weighted towards max
  return Math.round(max / (Math.random() * max + 1));
}

// return the approximate exponent x is raised to equal y
function get_base_log(x, y) {
	return Math.log(y) / Math.log(x);
}

/***************************/
/*      SAVE AND LOAD      */
/***************************/

function save() { // save game to cookies
	set_cookie("savestring", get_savestring(), 365);
}

function get_savestring() { // the game state, encoded string of key-value pairs
	update();
	let saves = new Map(); // Map for ease of use, will be converted
	// collect all the game state variables
	saves.set("updated", updated);
	saves.set("food", food);
	// load up savestring
	let savestring = ""; // blank starter, convert to formatted string "key:value,key:value,"
	saves.forEach (function(value, key) {
		savestring += key + ":" + value + ","; 
	})
	return window.btoa(savestring); // return encoded savestring
}

function load(savestring) { // loads game from savestring
	// decode the string
	savestring = window.atob(savestring);
	// check string before loading the saves to variables
	if (savestring != "") {
		let array = savestring.split(","); // savestring format in pairs "key:value,key:value,"
		let saves = new Map(); // a map for ease of use
		for (pair of array) {
			let item = pair.split(":"); // split each pair into key and value
			saves.set(item[0], item[1]); // add the pair to saves map
		}
		// assign game state variables from the saves map
		updated = saves.get("updated");
		food = saves.get("food");
	}
	update();
}

function delete_game() { // wipe the savestring from cookies
	if (confirm("Do you want to delete your progress and start over?")) {
		wipe_cookie("savestring");
		location.reload();
		return true;
	}
	return false;
}

function export_save() { // give savestring to user
	display_message(`
		Copy and paste somewhere safe:
		<input type="text" id="savestring" class="textbox" value="${get_savestring()}">
		<button type="button" onclick="copy_text('savestring')">Copy</button>
	`, "Cancel");
}

function import_save() { // allows user to load in a savestring
	display_message(`
		This will overwrite the current game. Paste the text you exported earlier and tap "import": 
		<input type="text" id="loadstring" class="textbox" value="">
		<button type="button" onclick="load(copy_text('loadstring'))">Import</button>
	`);
}

function set_cookie(cname, cvalue, exdays) { // create new cookie
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Strict;";
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

/***************************/
/*         DISPLAY         */
/***************************/

function switch_screen(screen) { // displays both the screen and the menu items
	for (let s of Screens) {
		document.getElementById(s).style.display = "none";
		document.getElementById("menu-"+s).classList.remove("menu-selected");
		document.getElementById("menu-"+s).style.display = "inline-block";
	}
	document.getElementById(screen).style.display = "inline-block";
	document.getElementById("menu-"+screen).classList.add("menu-selected");
}

function display() { // updates main displays
	
	// display header
	document.getElementById("header").innerHTML = `
		<h1>Inkopod Garden</h1>
		<div class="flexbox">
			<div class="flex1">
				<h2>
					<i class='fas fa-egg'></i> ${inkopod.count(null, "egg")}
					<i class='fas fa-bug'></i> ${inkopod.count(null, "idle")}
					<i class='fas fa-compass'></i> ${inkopod.count(null, "away")}
				</h2>
			</div>
			<div class="flex1">
				<h2>
					<i class='fas fa-cookie'></i> ${display_num(food)}
				</h2>
			</div>
		</div>
	`;

	// display inkopod population and buy buttons
	let units_screen = document.getElementById("units");
	units_screen.textContent = "";
	// for each type, create a box
	for (let type in inkopod.types){
		if (inkopod.creatable(type)) {
			let div = document.createElement("div");
			div.id = "type" + type;
			div.style.borderColor = inkopod.colour(type);
			div.classList = "flexbox unit";
			div.innerHTML = `
				<h2 class="flex1">
					<i class='fas fa-egg'></i> ${inkopod.count(type, "egg")}
					<i class='fas fa-bug'></i> ${inkopod.count(type, "idle")}
					<i class='fas fa-compass'></i> ${inkopod.count(type, "away")}
				</h2>
				<button class="flex0" type="button" onclick="new inkopod(${type})">
					<i class='fas fa-cookie'></i> ${display_num(inkopod.cost(type))}
				</button>
			`;
			units_screen.appendChild(div);
		}
	}

	// display missions
	let missions_screen = document.getElementById("missions");
	missions_screen.textContent = "";
	// missions introduction
	let intro = document.createElement("h2");
	intro.innerHTML = `Send inkopods on missions!`;
	missions_screen.appendChild(intro);
	for (let i in missions) { // for each mission
		let div = document.createElement("div");
		let mission = missions[i];
		let info = `<i class="fas fa-bug"></i> ${mission.recruits} <i class="fas fa-skull"></i> ${mission.get_loss()} <i class="fas fa-clock"></i> ${mission.get_time() / 60000} min.`;
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

	// display messages queue
	let messages_screen = document.getElementById("messages");
	messages_screen.textContent = "";
	for (let m in messages) {
		messages_screen.innerHTML += `<p>${messages[m]}</p>`;
	}

}

function display_num(num) {
	return Math.trunc(num.toLocaleString('en-US'));
	//num = Math.trunc(num); // only want whole numbers
	//let size = num.toString().length;
	//console.log(size);
	//num /= (10 * size);
	//return num;
	//return (Math.trunc(num / 10) / 10) + " (10^" + (size * 3) + ")";
	/*if (num < 1000000) {
		return num.toLocaleString('en-US');
	} else {
		let size = 1;
		while (num >= 1000000) {
			num = (Math.trunc(num / 100) / 10);
			size++;
		}
		return num.toLocaleString('en-US') + " x10^" + (size * 3);
	}*/

}

function display_message(message) {
	if (message != messages[0]) {
		messages.push(get_timestamp(Date.now()) + "   " + message);
	}
	display();
}

function close_message() {
	//messages.shift(0); // delete the current message
}

function get_timestamp(time) {
	let d = new Date(time);
	let yr = "2024";
	return yr.substring(2,4) + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();
}

function set_var(variable, value) { // css variables
	let r = document.querySelector(':root');
  r.style.setProperty(variable, value);
}

function change_hue() {
	let x = document.getElementById("slider").value;
	set_var("--c1", "hsl(" + x + ",80%,40%)");
	set_var("--c2", "hsl(" + x + ",80%,40%)");
	set_var("--cbg", "hsl(" + x + ",80%,20%)");
}