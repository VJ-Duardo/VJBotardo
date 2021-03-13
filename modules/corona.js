const fetch = require("node-fetch");
const braille = require('./generatebraille.js');
const countryCodes = require('./countryCodes.js');

var csvData;
loadData();

// The input data consists of comma separated values for each country. 
// The first 4 values in each line correspond to the Country, State and Latitude and Longitude.
// The following values in the line are numerical values corresponding to Coronavirus cases.
// Data starts at 22/1/2020
// Parsing data for queried country      australia,0,0,0,1,2,5,10 --> [0,0,0,1,2,5,10]
function parseData(country,dateStart,dateEnd, sayFunc, channelObj) {
	let multipleMatches = false;
	let rawCountryData = [];
	const dayInMiliseconds = 60*60*24*1000;
	let baseDate = new Date('2020-01-22');

	if (dateStart.getTime() === dateEnd.getTime() || dateStart > dateEnd){
	sayFunc(channelObj.name, "/me An error ocurred when trying to interpret the provided dates");
	return -1;
	}

	const diffDaysStart =  Math.round(Math.abs(dateStart-baseDate)/dayInMiliseconds);
	const diffDaysEnd =  Math.round(Math.abs(dateEnd-baseDate)/dayInMiliseconds) + 1;
    for (let i = 0; i < csvData.length; i++) {
        if (csvData[i].includes(country)) {
            let numericalData = csvData[i].split(',').slice(4+diffDaysStart,diffDaysEnd+4).map(function (x) {
                return parseInt(x);
            });

	// Deal with more than 1 row of data per country (USA, canada, etc)
            if (multipleMatches === false) {
                multipleMatches = true;
                rawCountryData = numericalData;
            } else if (multipleMatches === true) {
                for (let j = 0; j < rawCountryData.length; j++) {
                    rawCountryData[j] += numericalData[j];
                }
            }
        }
    }
    if (rawCountryData.length === 0) {
	sayFunc(channelObj.name, "/me There doesn't seem to be data for this country");
	return -1;
    }
    return rawCountryData;
}


// [0,0,0,1,2,5,10,15] --> [0,0] [0,1] [2,5] [10,15] --> [0, 1, 7, 25]
function createHistogram(data, bins, height, sayFunc, channelObj) {
    if (bins > data.length) {
	sayFunc(channelObj.name, "/me Width is too large or data range is too short to fit the data");
        return -1;
    }

    let minBinSize = Math.trunc(data.length / bins);
    // the number of bins given via input (aka make sure we get desired width)
    let binChange = bins - data.length % bins;
    let histogramData = [];
    let j = 0;
    for (let i = 0; i < bins; i++) {
        let bin = [];
        let binSize = minBinSize;
        if (i >= binChange) {
            binSize++;
        }
        bin = data.slice(j, j + binSize);
        j += binSize;

        // Add all the elements in the bin into one single value [1,2,3,4] --> 10
        histogramData.push(bin.reduce(function (accumulator, currentValue) {
            return accumulator + currentValue;
        }));
    }

    // Scale histogram according to height
    const dataMax = Math.max(...histogramData);
    histogramData = histogramData.map(function (x) {
        return Math.round(x / dataMax * height);
    });

    return histogramData;
}


//		  [0, 0, 0, 0, ^
// 		   0, 0, 1, 0, |
// [0,2,4,3] -->   0, 0, 1, 1, | height
// 		   0, 1, 1, 1, |
// 		   0, 1, 1, 1] ∨
function histogramToMatrix(data, height) {
    let matrix = [];
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < data.length; j++) {
            if (data[j] === height) {
                matrix = matrix.concat([255, 255, 255, 1]);
            } else {
                matrix = matrix.concat([0, 0, 0, 1]);
                data[j]++;
            }
        }
    }
    return matrix;
}


function loadData(){
    fetch("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv")
        .then((response) => {
            return response.text();
        })
        .then((text) => {
            if (text !== "" && text)
                csvData = text.toLowerCase().split(/\r?\n/);
        })
        .catch(function(e) {
            console.log(e);
        });
}


function corona(channelObj, sayFunc, userInput) {
	if (typeof userInput === 'undefined' || userInput === ""){
		sayFunc(channelObj.name, `/me Correct usage: ${channelObj.prefix}corona <country>`);
	return;
	}

	// Default values
	let height = 13;
	let width = 30;
	let dateStart = new Date('2020-01-22'); //Start of data record
	let dateEnd = new Date(); //Today
	let gifMode = false;

	// Parsing of parameters
	userInput = userInput.split(" ");
	for (let i = 0; i<userInput.length; i++){
	    if (userInput[i].charAt(0) ==='-'){
		    let parameter = userInput.slice(i,i+2);

		    switch(parameter[0]){
			    case '-f':
			    case '--from':
				    dateStart = new Date(parameter[1]);
				    break;
			    case '-t':
			    case '--to':
				    dateEnd = new Date(parameter[1]);
				    break;

			    case '-h':
			    case '--height':
				    height = parseInt(parameter[1]);
				    break;

			    case '-w':
			    case '--width':
				    width = parseInt(parameter[1]);
				    break;
			    case '-g':
			    case '--gif':
				    gifMode = true;
				    break;
			    
			    default:
				sayFunc(channelObj.name, "/me Could not understand parameter "+ parameter[0]+". Check !commands for more info.");
				    return;
		    }
	    }
	}

	if((width+1) * height > 500){
		sayFunc(channelObj.name, "/me You reached the character limit (500). Adjust your height and width.");
	}

	// Try to recognize country provided by user
	let inputCountry = userInput[0];
	let validCountry = false;

	// Convert emoji to country code
	if ( inputCountry.length === 4 ){
		inputCountry = Array.from(inputCountry).map(countryCodes.emojiToLetter).join("");
	}
	for (let i=0; i<countryCodes.countryCodes.length; i++){
		if (countryCodes.countryCodes[i].includes(inputCountry.toLowerCase())){
			inputCountry = countryCodes.countryCodes[i][0];
			validCountry = true;
			break;
		}
	}
	if (validCountry === false){
		sayFunc(channelObj.name, "/me Input was not recognised as a country");
		return;
	}
	console.log("Country found:" + inputCountry);



	if (gifMode === true){
		const frames = 15;
		const initialDayOffset = 60;
		const dateStart = new Date('2020-01-22');
		let movingDate = new Date(dateStart.valueOf());
		movingDate.setDate(movingDate.getDate() + initialDayOffset);

		const dayInMiliseconds = 60*60*24*1000;
		const  daysSinceStart = Math.round(Math.abs(new Date() - dateStart)/dayInMiliseconds);
	//Days we move forward every frame. This is calculated such that  we always reach the end of the data and we never exceed 20 frames in total.
		const advanceDays = Math.ceil((daysSinceStart - initialDayOffset)/(frames-1));

		for (let i=0; i<frames; i++){

		if (coronaGenAscii(inputCountry, dateStart, movingDate, width, height,sayFunc,channelObj) === -1){
			break;
		}

		movingDate.setDate(movingDate.getDate() + advanceDays);
		}

	}
	else{
	coronaGenAscii(inputCountry, dateStart, dateEnd, width, height,sayFunc,channelObj);
	}

}


function coronaGenAscii(country, start, end, width, height , sayFunc, channelObj){

	let cumulativeData = parseData(country,start,end, sayFunc, channelObj);
	if (cumulativeData === -1){
		return -1;
	}

	let dailyData = [];
	for (let i = 1; i < cumulativeData.length; i++) {
	dailyData.push(cumulativeData[i] - cumulativeData[i - 1]);
	}


	let histogram = createHistogram(dailyData, width * 2, height * 4, sayFunc, channelObj);
	if (histogram === -1){
		return -1;
	}
	matrix = histogramToMatrix(histogram, height * 4);
	 
	sayFunc(channelObj.name,braille.iterateOverPixels(matrix, width * 2, 128, false));

}


module.exports.corona = corona;
module.exports.loadCoronaData = loadData;
