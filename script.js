let updated = Date.now(); // date of the last time values were updated
let food = 10; // new action currency
let messages = []; // a queue of message strings
let missions = []; // array of mission objects
let cookie_savestring = get_cookie("savestring");
const Screens = ["home", "settings"];

// if save file exists, load it:
if (cookie_savestring != "") {
	load(cookie_savestring);
}

switch_screen("home");

/****************************/
/*      MAIN FUNCTIONS      */
/****************************/

// save the game every minute
setInterval(function() {
	save(); // save game (which also runs update())
}, 60000);

// update the display every 10 seconds
setInterval(function() {
	update();
}, 10000)

function update() { // update main variables and the display
	
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
	if ((food + value) >= 0) {
		food += value;
		food = Math.round(food, 4);
	};
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

// the game state, encoded string of key-value pairs
function get_savestring() {
	
	update(); // update everything before saving

	let saves = new Map(); // Map for ease of use, will be converted
	
	// collect game state variables
	saves.set("updated", updated);
	saves.set("food", food);
	saves.set("population", inkopod.population);

	// collect inkopod variables
	for (let id in inkopod.array) { 
		saves.set("ink" + id + "type", inkopod.array[id].type);
		saves.set("ink" + id + "birth", inkopod.array[id].birthday);
		saves.set("ink" + id + "state", inkopod.array[id].state);
	}

	// load up savestring
	let savestring = ""; // blank starter, convert to formatted string "key:value,key:value,"
	saves.forEach (function(value, key) {
		savestring += key + ":" + value + ","; 
	})

	return window.btoa(savestring); // return encoded savestring
}

// Loads game from Savestring
function load(savestring) {

	// decode the string
	savestring = window.atob(savestring);
	
	// check string before loading the saves to variables
	if (savestring != "") {

		let array = savestring.split(","); // savestring format in pairs "key:value,key:value,"
		let saves = new Map(); // a map for ease of use
		for (let pair of array) {
			// split the pair and add to saves map
			saves.set(pair.split(":")[0], pair.split(":")[1]); 
		}

		// assign game state variables from the saves map
		updated = saves.get("updated");
		food = saves.get("food");

		// restore inkopods
		for (let id = 0; id < saves.get("population"); id++) {
			inkopod.restore(
				saves.get("ink" + id + "type"),
				saves.get("ink" + id + "birth"),
				saves.get("ink" + id + "state")
			);
		}

	}

	//update(); // update everything from newly loaded data
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
	for(let i = 0; i < ca.length; i++) {
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

function switch_screen(screen) {
	for (let s of Screens) {
		document.getElementById(s).style.display = "none";
		document.getElementById("menu-"+s).classList.remove("menu-selected");
		document.getElementById("menu-"+s).style.display = "inline-block";
	}
	document.getElementById(screen).style.display = "inline-block";
	document.getElementById("menu-"+screen).classList.add("menu-selected");
	display();
}

function display() { // updates all displays
	display_header();
	display_home_screen();
	display_mission_screen();
	display_messages_screen();
}

function display_header() {
	document.getElementById("header").innerHTML = `
		<h1>Inkopod Garden</h1>
		<h2>
			<i class='fas fa-bug'></i> : ${inkopod.population} | 
			<i class='fas fa-cookie'></i> : ${display_num(food)}
		</h2>
	`;
}

// home screen shows inkopods and allows you to make more of them
function display_home_screen() {
	
	// list creatable eggs, one box for each type
	let egg_area = document.getElementById("egg-area");
	egg_area.textContent = "";
	for (let type in inkopod.types){
		if (inkopod.creatable(type)) {
			let btn = document.createElement("button");
			btn.classList = "flex0";
			btn.style.borderColor = inkopod.colour(type);
			btn.onclick = function() {
				inkopod.create(type);
				display();
			};
			btn.innerHTML = `
				+ <i class='fas fa-egg' style="color: ${inkopod.colour(type)}"></i> 
				(${display_num(inkopod.cost(type))})
			`;
			egg_area.appendChild(btn);
		}
	}

	// list entire population, in order of appearance
	let pop_area = document.getElementById("pop-area");
	pop_area.textContent = "";
	for (let ink of inkopod.array) {
		let btn = document.createElement("button");
		btn.style.borderColor = ink.colour;
		btn.classList = "flex0";
		btn.onclick = function() {
			ink.hatch();
			display();
		};
		let icon = "";
		switch (ink.state) {
			case "egg": icon = "egg"; break;
			case "mature": icon = "circle-exclamation"; break;
			case "idle": icon = "bug"; break;
			case "busy": icon = "compass"; break;
		}
		btn.innerHTML = `
			<i class='fas fa-${icon}' style="color: ${ink.colour}"></i>
		`;
		pop_area.appendChild(btn);
	}
}

function display_mission_screen() {
	/*
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
	*/
}

function display_messages_screen() {
	let messages_screen = document.getElementById("messages");
	messages_screen.textContent = "";
	for (let m in messages) {
		messages_screen.innerHTML += `<p>${messages[m]}</p>`;
	}
}

function display_num(num) {
	return Math.trunc(num);
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
	//messages.shift(0);
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