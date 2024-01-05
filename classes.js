// Classes for Inkopod Garden

class Inkopod {
	#age = 0;
	#stage = 0;
	#task = 0;
	#type = 0;
	constructor(type) {
		this.#type = type;
	}
	
	get color() {return Colours[this.type];}

	grow() { // advance its growth stage
		if (stage = 0) {stage = 1;}
	}
}

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
}