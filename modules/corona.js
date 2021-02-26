const fs = require("fs");
const braille = require('./generatebraille.js');


// The input data consists of comma separated values for each country. 
// The first 4 values in each line correspond to the Country, State and Latitude and Longitude.
// The following values in the line are numerical values corresponding to Coronavirus cases.
// Data starts at 22/1/2020
// Parsing data for queried country      australia,0,0,0,1,2,5,10 --> [0,0,0,1,2,5,10]
function parseData(filename, country) {
    let file = fs.readFileSync(filename, "utf8");
    let rawArray = file.split(/\r?\n/);
    let multipleMatches = false;
    let rawCountryData = [];
    for (let i = 0; i < rawArray.length; i++) {
        if (rawArray[i].includes(country)) {
            let numericalData = rawArray[i].split(',').slice(4).map(function (x) {
                return parseInt(x);
            });
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
        return -1;
    }
    return rawCountryData;
}


// [0,0,0,1,2,5,10,15] --> [0,0] [0,1] [2,5] [10,15] --> [0, 1, 7, 25]
function createHistogram(data, bins, height) {
    if (bins > data.length) {
        console.log("Error: Number of bins greater than data length");
        return 1;
    }
    let minBinSize = Math.trunc(data.length / bins);
    // size of first bin will be equal or lower than bin size to guarantee always
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

    const dataMax = Math.max(...histogramData);
    histogramData = histogramData.map(function (x) {
        return Math.round(x / dataMax * height);
    });

    return histogramData;
}


function histogramToMatrix(data, height) {
    let matrix = [];
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < data.length; j++) {
            if (data[j] === height) {
                matrix.push(1);
            } else {
                matrix.push(0);
                data[j]++;
            }
        }
    }
    return matrix;
}


function corona(channelObj, sayFunc, userInput) {
    if (typeof userInput === 'undefined' || userInput === ""){
        sayFunc(channelObj.name, `/me Correct usage: ${channelObj.prefix}corona <country>`);
        return;
    }
    
    const height = 13;
    const width = 31;
    let inputCountry = userInput;
    let cumulativeData = parseData("./assets/corona.csv", inputCountry);
    if (cumulativeData === -1) {
        sayFunc(channelObj.name, "/me Country not found.");
        return;
    }

    let dailyData = [];
    for (let i = 1; i < cumulativeData.length; i++) {
        dailyData.push(cumulativeData[i] - cumulativeData[i - 1]);
    }
    
    let histogram = createHistogram(dailyData, width * 2, height * 4);
    if (histogram === -1){
        sayFunc(channelObj.name, "Something went wrong :(");
        return;
    }
    matrix = histogramToMatrix(histogram, height * 4);
    sayFunc(channelObj.name, braille.iterateOverPixels(matrix, width * 2, 128, false));
}


module.exports.corona = corona;
