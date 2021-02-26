const fs = require("fs");
const util = require('util');
const braille = require('./generatebraille.js');


// The input data consists of comma separated values for each country. 
// The first 4 values in each line correspond to the Country, State and Latitude and Longitude.
// The following values in the line are numerical values corresponding to Coronavirus cases.
// Data starts at 22/1/2020
// Parsing data for queried country      australia,0,0,0,1,2,5,10 --> [0,0,0,1,2,5,10]
function parseData(filename,country){
let file = fs.readFileSync(filename, "utf8");
let rawArray = file.split(/\r?\n/);
let multipleMatches = false;
let rawCountryData = [];
for (let i=0; i<rawArray.length; i++){
	if(rawArray[i].includes(country)){
let numericalData =rawArray[i].split(',').slice(4).map(function (x){ return parseInt(x);});
		if (multipleMatches == false){
			multipleMatches = true;
			rawCountryData = numericalData;
		}
		else if (multipleMatches == true){
			for (let j=0; j<rawCountryData.length; j++){
				rawCountryData[j] += numericalData[j];
			}
		}
	}	
}
// console.log(util.inspect(rawCountryData,{maxArrayLength: null }));
if (rawCountryData.length == 0){
	return 1;
}
return rawCountryData;
}




// [0,0,0,1,2,5,10,15] --> [0,0] [0,1] [2,5] [10,15] --> [0, 1, 7, 25]
function createHistogram(data, bins,height){
	if (bins > data.length){
		console.log("Error: Number of bins greater than data length");
		return 1;
	}
	let minBinSize = Math.trunc(data.length/bins);
	// size of first bin will be equal or lower than bin size to guarantee always
	// the number of bins given via input (aka make sure we get desired width)
	let binChange = bins-data.length%bins;
	console.log("hi");
	console.log(binChange);
	let histogramData = [];
	let j=0;
	for (let i=0; i< bins; i++){
		let bin = [];
		let binSize = minBinSize;
		if ( i  >= binChange){
			binSize++;
		}
		bin = data.slice(j,j+binSize);
		j += binSize;
	console.log(util.inspect(bin,{maxArrayLength: null }));
	console.log(util.inspect(binSize,{maxArrayLength: null }));

	// Add all the elements in the bin into one single value [1,2,3,4] --> 10
	histogramData.push(bin.reduce(function(accumulator,currentValue,currentIndex,array){return accumulator + currentValue}));
	}

	const dataMax = Math.max(...histogramData)
	histogramData = histogramData.map(function(x) {return Math.round(x/dataMax*height)});

	console.log(util.inspect(histogramData,{maxArrayLength: null }));
	return histogramData;
}




function histogramToMatrix(data,height){
	let matrix = [];
	for (let i=0; i<height; i++){
		for (let j=0; j<data.length; j++){
			if (data[j] == height){
				matrix.push(1);
			}
			else{
				matrix.push(0);
				data[j]++;
			}
		}
	}
	return matrix;
}
			



function corona(channelObj, sayFunc, userInput){
let height = 13;
let width = 31;
let inputCountry = userInput;
let cumulativeData = parseData("./assets/corona.csv",inputCountry);
if (cumulativeData == 1){
	return "Country not found";
}

let dailyData =[];
for (let i=1; i< cumulativeData.length; i++){
	dailyData.push(cumulativeData[i] - cumulativeData[i-1]);
}

matrix = histogramToMatrix(createHistogram(dailyData,width*2,height*4),height*4);
sayFunc(channelObj.name, braille.iterateOverPixels(matrix,width*2,128,false));
return;
}


module.exports.corona = corona;
