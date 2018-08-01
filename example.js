const fs = require('fs');
const PowerCalculator = require('./powercalculator');

let powerCalculator = new PowerCalculator();

fs.readFile('data/input.json', (err, data)=>{
	
	if(!err){
		data = JSON.parse(data);
		let output = powerCalculator.setData(data).start();	
						
		console.log(output);				
	} else {
		throw new Error(err);	
	}
	
})