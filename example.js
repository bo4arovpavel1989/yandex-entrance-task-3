const fs = require('fs');
const PowerCalculator = require('./powercalculator');


fs.readFile('data/input.json', (err, data)=>{
	
	if(!err){
		data = JSON.parse(data);
		let powerCalculator = new PowerCalculator(data);
		let output = powerCalculator.start();	
						
		console.log(output);				
	} else {
		throw new Error(err);	
	}
	
})