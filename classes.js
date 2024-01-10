// Inkopod Garden

// everything to do with the inkopods
class inkopod {

	// should only be constructed using the create and restore methods
	static #constructable = false;

	constructor(type, birthday, state) {
		if (inkopod.#constructable) {
			this.type = type;
			this.birthday = birthday; // date in milliseconds from epoch
			this.state = state; // egg, mature, idle, busy;
			this.colour = inkopod.colour(this.type);
			this.strength = inkopod.strength(this.type);
			inkopod.array.push(this);
			inkopod.#constructable = false;
		}
	}

	// create a brand new Inkopod and adjust the food supply accordingly
	// this only runs if the inkopod is considered creatable
	static create(type) {
		if (inkopod.creatable(type)) {
			inkopod.#constructable = true;
			update_food(-inkopod.cost(type));
			if (type == 0) {type = get_random(1,3);}
			new inkopod(type, Date.now(), "egg");
		}
	}

	// restore an inkopod from earlier, such as when loading save file
	// this one does not require a type of inkopod is creatable
	static restore(type, birthday, state) {
		inkopod.#constructable = true;
		new inkopod(type, birthday, state);
	}

	get age() {return Date.now() - this.birthday;}

	// user will click a mature egg to run this
	hatch() {
		if (this.state == "mature") {
			this.state = "idle";
		}
	}

	static array = []; // contains all inkopods

	// a 2d array with type data
	// 0=Name, 1=Colour, 2=Strength
	static types = [
		["Wild", "gray", 3], // becomes a C, M, or Y on create
		["Cyan", "#00ffff", 1],
		["Magenta", "#f500f5", 1],
		["Yellow", "#f2f200", 1],
		["Green", "00ff00", 3],
		["Blue", "#0000f5", 3],
		["Red", "#f20000", 3],
		["Teal", "#00f5ab", 6],
		["Orange", "#f27a00", 6],
		["Purple", "#7a00f5", 6],
		["Black", "#0a0a0a", 10],
		["White", "#f5f5f5", 10]
	]

	// total food per minute
	static get production() {
		let fpm = 1;
		for (let ink of inkopod.array) {
			if (ink.state == "idle") {
				fpm += inkopod.strength(ink.type);
			}
		}
		return fpm;
	}

	// size of inkopod population
	static get population() {return inkopod.array.length;}
	
	// check if type is creatable, return boolean
	static creatable(type) {
		// check there is enough food and that the type actually exists
		if (food >= inkopod.cost(type) && type >= 0 && type < inkopod.types.length) {
			if (inkopod.name(type) == "Wild") { // can always create wild type
				return true;
			} else if (inkopod.count(type, "idle") > 0) { // if you already have at least one of the type
				return true;
			} else {
				return false;
			}
		}
	}

	// lookup name by type
	static name(type) {
		return inkopod.types[type][0];
	}

	// lookup colour code by type
	static colour(type) {
		return inkopod.types[type][1];
	}

	// lookup strength modifier by type
	static strength(type) {
		return inkopod.types[type][2];
	}

	// quantity of a type or state, or both
	static count(type = null, state = null) {
		let count = 0;
		for (let ink of inkopod.array) {
			if (type == null || state == null) {
				if (ink.type == type || ink.state == state) {count++;}
			} else {
				if (ink.type == type && ink.state == state) {count++;}
			}
		}
		return count;
	}

	// food cost to create a unit of type
	static cost(type) {
		if (type == 0) {
			return ((inkopod.population ** 3) + 1) * 3;
		} else {
			return ((inkopod.count(type) ** 3) + 1) * inkopod.strength(type);
		}
	}

	// runs every minute to cause all the inkopods to mature
	static mature() {
		setInterval(function() {
			for (let ink of inkopod.array) {
				// TESTING, normally 300,000
				if (ink.state == "egg" && ink.age >= (3000 * ink.strength)) {
					ink.state = "mature";
				}
			}
		}, 1000); // testing, normally 60,000
	}
}

inkopod.mature(); // ensures this script starts running



// everything to do with missions
class mission {
	constructor(state, min_recruits, max_loss, max_time, committ, end_date) {
		this.state = state; //["ready", "accepted", "completed"]
		this.min_recruits = min_recruits;
		this.max_loss = max_loss;
		this.max_time = max_time;
		this.committ = committ;
		this.end_date = end_date;
	}
	accept() {
		if ((this.state == 0) && (this.recruits <= get_available())) {
			this.end_date = (Date.now() + this.get_time());
			this.state = 1;
		}
	}
	progress() {
		if ((this.state == 1) && (Date.now() >= this.end_date)) {
				this.state = 2;
		}
	}
	recruit(mod) {this.committ = mod;}
	complete(array_id) {
		let reward = 1; // TODO calculate reward and update accordingly
		let actual_loss = get_random(1, this.get_loss());
		let decrement = actual_loss;
		while (decrement >= 1) {
			let target = ((get_weighted_random(Math.ceil(types / 3)) - 1) * 3) + get_random(0, 2);
			if (units[target] >= 1) {
				adjust_unit(target, -1);
				decrement--;
			}
		}
		let message = "You completed a mission! <br>Reward: <i class='fas fa-bolt'></i> " + display_num(reward) + " <br>Losses: <i class='fas fa-skull'></i> " + actual_loss;
		display_message(message);
		missions.splice(array_id, 1);
	}
	get recruits() {return (this.min_recruits * this.committ);}
	get_time() {
		let time = 0;
		if (this.state == 0) {time = Math.ceil(this.max_time / this.committ);}
		if (this.state == 1) {time = this.end_date - Date.now();}
		return Math.max(time, 0);
	}
	get_loss() {return Math.ceil(this.max_loss / this.committ);}
	// how often Missions occur in milliseconds
	static get frequency() {
		return 1000 * 60 * 30; // 30 min to generate Mission
	}
	// maximum number of Missions that can be available
	static get maximum() {return 6;}
}