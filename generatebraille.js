const { createCanvas, loadImage } = require('canvas');
const brailleData = require('./brailledata.js');

const height = 60;
const width = 60;


class Pixel {
    constructor(red, green, blue, alpha){
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }
}

module.exports = {
    processImage: function(src, second_try=false){
        console.log(src);
        if (typeof src === 'undefined'){
            return;
        }
        
        var canvas = createCanvas(height, width);
        var context = canvas.getContext('2d');
        //let image = new Image();
        //image.crossOrigin = "Anonymous";
        //image.src = src;

        return loadImage(src)
            .then((image) => {
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            let pixel_data = context.getImageData(0, 0, canvas.width, canvas.height).data;
            return iterate_over_pixels(pixel_data, canvas.width);
        })
            .catch((error) => {
                console.log("errorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerrorerror");
        });

        /*image.onerror = function(){
            if (second_try){
                set_error_state();
            } else {
                process_image(corsproxy+cached_url, true);
            }
        };*/
    }
}

function iterate_over_pixels(data_array, width){
    color_treshold = 255;
    let result_array = new Array();
    let pixel_array = new Array();
    for(i=0; i<data_array.length; i+=4){
        pixel_array.push(new Pixel(data_array[i], data_array[i+1], data_array[i+2], data_array[i+3]));
    }
    
    for(i=0; i<pixel_array.length; i+=(width*4)){
        let line = "";
        for(j=0; j<width; j+=2){
            line += brailleData.braille_descr_dic[get_braille_code(pixel_array, i+j, width)];
        }
        result_array.push(line);
    }
    
    return result_array.join(' \n').replace(/[⠀]/g, '⠄');
}


function get_braille_code(pixel_array, pos, width){
    let braille_code = "";
    let pixel_pos_to_braille_pos = {
        '00': '1',
        '01': '2',
        '02': '3',
        '03': '7',
        '10': '4',
        '11': '5',
        '12': '6',
        '13': '8'
    };
    for(k=0; k<2; k++){
        for(l=0; l<4; l++){
            if ((pos + k + (width*l)) < pixel_array.length){
                if (evaluate_pixel(pixel_array[(pos + k + (width*l))])){
                    braille_code += pixel_pos_to_braille_pos[(k.toString() + l.toString())];
                }
            }
        }
    }
    return braille_code.split("").map(Number).sort((a, b) => (a - b)).join('');
}


function evaluate_pixel(pixel){
    if (pixel.alpha === 0){
        return true;
    } else {
        return false;
    }
}