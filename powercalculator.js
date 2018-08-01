const fs = require('fs');

class PowerCalculator {
	constructor(){
		this.data = [];
		this.output = [];
		this.timeLeft = 24;
		this.dayTimeLeft = 14;
		this.nightTimeLeft = 10;
		this.maxPower;
		this.rate;
	}
	
	setData(data){
		this.data = data;
		this.maxPower = data.maxPower;
		this.rate = data.rates[0];
		
		return this;
	}
	
	checkData(){
		if(typeof(this.data) !== 'object')
			throw new Error('Input data must be an object!')
		if(!this.data.devices || !this.data.rates || !this.data.maxPower)
			throw new Error('Input data must contain devices, rates and maxPower fields!')		
	}
	
	markCheapestTime(val){ //помечаем период как используемый и возвращаем его
		let i;
	
		for (i = 0; i < this.data.rates.length; i++) {
			if (this.data.rates[i].value === val && !this.data.rates[i].isMarked) {
				this.data.rates[i].isMarked = true;
				this.rate = this.data.rates[i];
				break;
			}	
		}
		
		return this.data.rates[i];
	}
	
	getUnmarkedRates(){
		let rates = [];
		
		this.data.rates.map(r => {
			if(!r.isMarked)
				rates.push(r);
		})
		
		return rates;
	}
	
	getCheapestTime(){ //выбираем наиболее дешевый период из тех что у нас осталось в запасе
		let rates = this.getUnmarkedRates();
		let val = rates[0].value;
		
		rates.map(r => {
			val = (r.value <= val) ? r.value : val;	
		});
			
		return this.markCheapestTime(val);
	}
	
	getEmergencyNeededDevice(timeOfDay){ //выбираем устройство, которое в любом случае должно работать все оставшееся время
		let devices = [];
		
		this.data.devices.map((d,i) => {
			if (d.duration === this.timeLeft && d.duration > 0){ //устройство должно работать все оставшиеся сутки
				devices.push(d);
				this.data.devices[i].duration--;
				
			} else if(timeOfDay === 'day') {
				
				if(d.mode && d.mode === 'day') {
					if (d.duration === this.daytTimeLeft  && d.duration > 0 ){ //устройство должно работать все оставшееся дневное время
						devices.push(d);
						this.data.devices[i].duration--;
					}	
				}
					
			} else if(timeOfDay === 'night') { 
				
				if (d.mode && d.mode === 'night'){
				
					if (d.duration === this.nightTimeLeft && d.duration > 0) { //устройство должно работать все оставшееся ночное время
						devices.push(d);
						this.data.devices[i].duration--;
					}	
				}
			}
		})
		
		return devices;
	}
	
	/*
	выбираем наиболее мощное устройство, 
	но не превышающее остаточную мощность сети и еще не задействованное в 
	текущем часе
	*/
	
	
	getMostExpensiveDevices(maxPower, timeOfDay, schedule){ 
		let deviceID;
		
		let isMore = false;
		let power = 0;		
		
		this.data.devices.map((d, i) => {
			
			if(!schedule.includes(d.id)) {
				isMore = ((d.mode === undefined || d.mode === timeOfDay) && //день-ночь совпадает либо неважнол 
				d.power > power && //мощность наибольшая из возможных
				d.power <= maxPower && //мощность меньше остаточной
				d.duration > 0) ? true : false; //устройство еще должно поработать		
				
				if (isMore) {
					power = d.power;
					deviceID = d.id;
				}
			}
		})
				
		return deviceID;
	}
	
	getDeviceById(id){
		let i;
		
		for (i = 0; i < this.data.devices.length; i++) {
			if(this.data.devices[i].id === id) 
				break;
		}
		
		return this.data.devices[i];
	}
	
	start(){
		this.checkData();
		
		let output = {
			schedule: {
				"0": [],
				"1": [],
				"2": [],
				"3": [],
				"4": [],
				"5": [],
				"6": [],
				"7": [],
				"8": [],
				"9": [],
				"10": [],
				"11": [],
				"12": [],
				"13": [],
				"14": [],
				"15": [],
				"16": [],
				"17": [],
				"18": [],
				"19": [],
				"20": [],
				"21": [],
				"22": [],
				"23": []
				},
			consumedEnergy: {value:0, devices: {}}
		}
		
		
		while (this.timeLeft > 0) {
			let currentRate = this.getCheapestTime();
			let h = currentRate.from;
			
			//console.log(this.data)
			
			while ( h !== currentRate.to) {
				console.log(h);
				let maxPower = this.maxPower;
				let timeOfDay = (h >= 7 && h < 21) ? 'day' : 'night';
								
				let emergDevices = this.getEmergencyNeededDevice(timeOfDay);
				
				emergDevices.map(d => { //включаем в расписание устройства, которым в первую очередь необходимо работать
					
					output.schedule[h.toString()].push(d.id);
					
					maxPower -= d.power;
					
					if (maxPower < 0)
						throw new Error('Too many devices! Not enough power!');
					
					output.consumedEnergy.value += d.power * currentRate.value;
						
					if(!output.consumedEnergy.devices[d.id])
						output.consumedEnergy.devices[d.id] = d.power * currentRate.value;
					else 
						output.consumedEnergy.devices[d.id] += d.power * currentRate.value;
				});
								
				while (maxPower > 0) {	//на оставшуюся мощность выбираем наиболее мощные устройства				
					let maxPowerDeviceId = this.getMostExpensiveDevices(maxPower, timeOfDay, output.schedule[h.toString()]);
										
					if (maxPowerDeviceId){
						let maxPowerDevice = this.getDeviceById(maxPowerDeviceId);
												
						maxPower -= maxPowerDevice.power;
						
						maxPowerDevice.duration--;
						
						output.schedule[h.toString()].push(maxPowerDeviceId);
						
						output.consumedEnergy.value += maxPowerDevice.power * currentRate.value;
						
						if(!output.consumedEnergy.devices[maxPowerDeviceId])
							output.consumedEnergy.devices[maxPowerDeviceId] = maxPowerDevice.power * currentRate.value;
						else 
							output.consumedEnergy.devices[maxPowerDeviceId] += maxPowerDevice.power * currentRate.value;
					} else {
						maxPower = 0; //больше устройств не влезет в этот час
					}
				}
				
				this.timeLeft--;
				
				if(h >= 7 && h < 21) {
					this.dayTimeLeft--;
				} else {
					this.nightTimeLeft--;
				}
				
				
				if(++h === 24)
					h = 0;
			}		
		}
		
		return output;
	}
}

module.exports = PowerCalculator;

