class PowerCalculator {
	constructor(){
		this.data = [];
		this.timeLeft = 24;
		this.dayTimeLeft = 14; //с 7 до 21 не включительно
		this.nightTimeLeft = 10; //с 21 до 7 не включительно
		this.maxPower;
	}
	
	setData(data){
		this.data = data;
		this.maxPower = data.maxPower;
		
		return this;
	}
	
	checkData(){
		if(typeof(this.data) !== 'object')
			throw new Error('Input data must be an object!');
		
		if(!this.data.devices || !this.data.rates || !this.data.maxPower)
			throw new Error('Input data must contain devices, rates and maxPower fields!');
		
		if(typeof(this.data.devices) === 'object' && !isNaN(this.data.devices.length)) {
			if (this.data.devices.length === 0)
				throw new Error('Device key in input data object must be non empty array!');
		} else {
			throw new Error('Devices key in input data object must be an array!');
		}
		
		if(typeof(this.data.rates) === 'object' && !isNaN(this.data.rates.length)) {
			if (this.data.rates.length === 0)
				throw new Error('Rates key in input data object must be non empty array!');
		} else {
			throw new Error('Rates key in input data object must be an array!');
		}
		
		if(typeof(this.data.maxPower) !== 'number' || isNaN(this.data.maxPower))
			throw new Error('MaxPower data must be a number!');
		
		this.data.devices.map((d, i) => {			
			if(typeof(d) !== 'object')
				throw new Error('Devices array must contain object members!');
			
			if (typeof(d.id) !== 'string')
				throw new Error(`Device id must be a string. Check device #${i+1}!`);
			
			if(typeof(d.name) !== 'string')
				throw new Error(`Device name must be a string. Check device #${i+1}!`);
			
			if(typeof(d.power) !== 'number' || isNaN(d.power))
				throw new Error(`Device power must be a number. Check device #${i+1}`);
			
			if(typeof(d.duration) !== 'number' || isNaN(d.power))
				throw new Error(`Device duration must be a number. Check device #${i+1}`);
			
			if(!(d.mode == 'day' || d.mode == 'night' || !d.mode))
				throw new Error(`Device mode must be a string values day, night or undefined. Check device #${i+1}`);
			
			if(d.duration > 24)
				throw new Error(`Device duration cannot be more than 24h. Check device #${i+1}`);
			
			if(d.power > this.data.maxPower)
				throw new Error(`Device #${i+1} overrides available power rate!`);
			
			if(d.mode === 'day') {
				if(d.duration > this.dayTimeLeft)
					throw new Error(`Device duration cannot be more than available day duration. Check device #${i+1}`);
			} else if (d.mode === 'night') {
				if(d.duration > this.nightTimeLeft)
					throw new Error(`Device duration cannot be more than available night duration. Check device #${i+1}`);	
			}
		});
		
		this.data.rates.map((r, i) => {
			if(typeof(r) !== 'object')
				throw new Error('Rates array must contain object members!')
			
			if(typeof(r.from) !== 'number' && isNaN(r.from))
				throw new Error(`Rates from param must be a number. Check rate #${i+1}!`);
			
			if(typeof(r.to) !== 'number' && isNaN(r.to))
				throw new Error(`Rates to param must be a number. Check rate #${i+1}!`);
			
			if(typeof(r.value) !== 'number' && isNaN(r.value))
				throw new Error(`Rates value param must be a number. Check rate #${i+1}!`);
			
			if(r.from > 23)
				throw new Error(`Rates value from cannot be more than 23. Check rate #${i+1}.`);
			
			if(r.to > 23)
				throw new Error(`Rates value to cannot be more than 23. Check rate #${i+1}.`);
			
			if(r.from < 0)
				throw new Error(`Rates value from must be positive. Check rate #${i+1}.`);
			
			if(r.to < 0)
				throw new Error(`Rates value to must be positive. Check rate #${i+1}.`);
		});
		
		this.checkRatesSchedule(this.data.rates);
	}
	
	checkRatesSchedule(rates){
		let rateSchedule = new Array(24);
		rateSchedule.fill(0);
		
		rates.map((r, i) => {
			let start = r.from;
			
			while (start !== r.to) {
				if(rateSchedule[start] === 1)
					throw new Error(`There are more than 1 rate for ${start} hour! Check rate #${i}.`);
				else
					rateSchedule[start] = 1;
				
				if(++start === 24)
					start = 0;
			}
		});
		
		if(rateSchedule.includes(0)) {
			let emptyHours = [];
			
			rateSchedule.map((k,i) => {
				if(k === 0)
					emptyHours.push(i);
			})
			
			throw new Error(`There are not defined value rates for hours: ${emptyHours}`);
		}
			
	}
	
	markCheapestTime(val){ //помечаем временной период как используемый и возвращаем его
		let i;
	
		for (i = 0; i < this.data.rates.length; i++) {
			if (this.data.rates[i].value === val && !this.data.rates[i].isMarked) {
				this.data.rates[i].isMarked = true;
				break;
			}	
		}
		
		return this.data.rates[i];
	}
	
	getUnmarkedRates(){ //получаем массив временных периодов, которые еще не были имспользованы
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
	
	/*
	выбираем устройство 1-й очереди, 
	которое в любом случае должно работать все оставшееся время
	*/
	
	getEmergencyNeededDevice(timeOfDay){ 
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
		let isMore;
		let power = 0;		
		
		this.data.devices.map((d, i) => {
			
			if(!schedule.includes(d.id)) { //устройства еще нет в расписании текущего часа
				isMore = ((d.mode === undefined || d.mode === timeOfDay) && //режим день-ночь совпадает либо неважно
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
			schedule: {},
			consumedEnergy: {value:0, devices: {}}
		}
		
		
		while (this.timeLeft > 0) {
			let currentRate = this.getCheapestTime();
			let h = currentRate.from;
									
			while ( h !== currentRate.to) {
				let maxPower = this.maxPower;
				let timeOfDay = (h >= 7 && h < 21) ? 'day' : 'night';		
				let emergDevices = this.getEmergencyNeededDevice(timeOfDay);
				output.schedule[h.toString()] = []; //заводим пустой массив в расписание текущего часа
				
				emergDevices.map(d => { //включаем в расписание устройства, которым в первую очередь необходимо работать
					
					output.schedule[h.toString()].push(d.id);
					
					maxPower -= d.power;
					
					if (maxPower < 0)
						throw new Error('Too many devices! Not enough power!');
					
					let price = d.power * currentRate.value;
										
					output.consumedEnergy.value += price;
						
					if(!output.consumedEnergy.devices[d.id])
						output.consumedEnergy.devices[d.id] = price;
					else 
						output.consumedEnergy.devices[d.id] += price;
				});
				
				/*
				на оставшуюся мощность выбираем наиболее мощные устройства,
				чтобы они успели поработать в наиболее дешовое время
				*/
				
				while (maxPower > 0) {				
					let maxPowerDeviceId = this.getMostExpensiveDevices(maxPower, timeOfDay, output.schedule[h.toString()]);
										
					if (maxPowerDeviceId){
						let maxPowerDevice = this.getDeviceById(maxPowerDeviceId);
												
						maxPower -= maxPowerDevice.power;
						
						maxPowerDevice.duration--;
												
						output.schedule[h.toString()].push(maxPowerDeviceId);
						
						let price = (maxPowerDevice.power * currentRate.value)
												
						output.consumedEnergy.value += price;
						
						if(!output.consumedEnergy.devices[maxPowerDeviceId])
							output.consumedEnergy.devices[maxPowerDeviceId] = price;
						else 
							output.consumedEnergy.devices[maxPowerDeviceId] += price;
					} else {
						maxPower = 0; //больше устройств не влезет в этот час, обнуляем переменную чтобы закончить цикл
					}
				}
				
				/*
				совершаем все временные сдвиги
				*/
				
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
		
		//делим все значения на 1000, чтобы получить значения для КВатт
		output.consumedEnergy.value /= 1000;
		
		for (let id in output.consumedEnergy.devices ) {
			output.consumedEnergy.devices[id] /= 1000;	
		}
		
		return output;
	}
}

module.exports = PowerCalculator;

