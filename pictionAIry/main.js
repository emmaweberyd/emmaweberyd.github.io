  
/*
variables
*/
var model;
var canvas;
var classNames = [];
var canvas;
var coords = [];
var mousePressed = false;

var json_quotes = {
    ambigious : 
    [
        "It doesn’t look like anything to me", 
        "Excuse you, that is literally superbad", 
        "Sorry, I didn’t quite get that", 
        "Is this done?", 
        "Waiting for it"
    ],
    fiftyfifty : [
        "This is an obvious", 
        "This is clearly"
    ], 
    barely : [
        "It's barely", 
        "It has the potential of becoming"
    ],
    clear : [
        "A neat little scribble of", 
        "I spy with my little AI: it's", 
        "Oh I know this one! It's gotta be", 
        "That's my favorite thing,"
    ],
    perfect : [
        "Fantastic! 10 points to gryffindor! It's",
        "Outstanding art performance:", 
        "Anyone can see that's", 
        "Even blind uncle Arnold could tell that's"
    ]
}


/*
prepare the drawing canvas 
*/
$(function() {
    //console.log("in main.js")
    canvas = window._canvas = new fabric.Canvas('canvas');
    canvas.backgroundColor = '#fff';
    canvas.isDrawingMode = 1;
    canvas.freeDrawingBrush.color = "black";
    canvas.freeDrawingBrush.width =  8;
    canvas.renderAll();
    

   // setup listeners 
    canvas.on('mouse:up', function(e) {
        getFrame();
        mousePressed = false
    });
    canvas.on('mouse:down', function(e) {
        mousePressed = true
    });
    canvas.on('mouse:move', function(e) {
        recordCoor(e)
    }); 

})

/*
set the table of the predictions 
*/
setGuesses = (top5, probs) => {

        for(var i=0; i < top5.length; i++){
            console.log(top5[i], ": ", Math.round(probs[i] * 100), "%");
        }
        console.log("--------------------");

        let guess = document.getElementById('guess')
        let prob = document.getElementById('prob')
        let firstGuess = {
            guess: top5[0],
            prob: Math.round(probs[0]*100)
        }
        let secondGuess = {
            guess: top5[1],
            prob: Math.round(probs[1]*100)
        }

        // generate quote randomly of first guess
        let quote = generateQuoteAccordingToAccuracy(firstGuess, secondGuess);    
        document.getElementById("guess").innerHTML = quote;

        // set table of probabilities
        setTable(top5, probs);
}

/* check if the word starts with a wovel and return a/an */
formatWord = (guess) =>{

    //var vowels = ["a", "e", "i", "o", "u"];
    var first = guess.charAt(0);
    var isVowel = first == "a" || first == "e" || first == "i" || first == "o" || first == "u";
    var article, word = "";

    if(isVowel) article = "an";
    else article = "a";
   
    word = article + " " + guess;

    return word;
}

setTable = (top5, probs) => {

    let text = document.getElementById('also');
    text.innerHTML = "It could also be: ";
        //loop over the predictions 
        for (var i = 0; i < top5.length; i++) {
            let sym = document.getElementById('sym' + (i + 1))
            let prob = document.getElementById('prob' + (i + 1))
            sym.innerHTML = top5[i]
            prob.innerHTML = " "+Math.round(probs[i] * 100)+"%"
        }
}

/* 

*/
generateQuoteAccordingToAccuracy = (firstGuess, secondGuess) =>{

    var firstWord = firstGuess.guess;
    var prob_1 = firstGuess.prob;

    var secondWord = secondGuess.guess;
    var prob_2 = secondGuess.prob;

    var noGuess = false;
    var quoteList = [];
    let quote = "";


    /*if((prob_1 - prob_2) < 2){
        quoteList = json_quotes.ambigious;
    }*/
    if(prob_1 <= 15 ){
        quoteList = json_quotes.ambigious;
        noGuess = true;
    }
    else if(prob_1 > 15 && prob_1 <= 60){
        quoteList = json_quotes.barely;
    }
    else if(prob_1 > 60 && prob_1 <= 90){
        quoteList = json_quotes.clear;
    }
    else if(prob_1 > 90){
        quoteList = json_quotes.perfect;
    }

    let randIndex = Math.floor(Math.random()*quoteList.length);
    let randQuote = quoteList[randIndex]
    
    if(noGuess) quote = randQuote;
    else quote = randQuote + " " + formatWord(firstWord);

    return quote;

}


/*
record the current drawing coordinates
*/
recordCoor = (event) => {
    var pointer = canvas.getPointer(event.e);
    var posX = pointer.x;
    var posY = pointer.y;

    if (posX >= 0 && posY >= 0 && mousePressed) {
        coords.push(pointer)
    }
}

/*
get the best bounding box by trimming around the drawing
*/
getMinBox = () => {
    //get coordinates 
    var coorX = coords.map(function(p) {
        return p.x
    });
    var coorY = coords.map(function(p) {
        return p.y
    });

    //find top left and bottom right corners 
    var min_coords = {
        x: Math.min.apply(null, coorX),
        y: Math.min.apply(null, coorY)
    }
    var max_coords = {
        x: Math.max.apply(null, coorX),
        y: Math.max.apply(null, coorY)
    }

    //return as strucut 
    return {
        min: min_coords,
        max: max_coords
    }
}

/*
get the current image data 
*/
getImageData = () => {
        //get the minimum bounding box around the drawing 
        const mbb = getMinBox()

        //get image data according to dpi 
        const dpi = window.devicePixelRatio
        const imgData = canvas.contextContainer.getImageData(mbb.min.x * dpi, mbb.min.y * dpi,
                                                      (mbb.max.x - mbb.min.x) * dpi, (mbb.max.y - mbb.min.y) * dpi);
            console.log(imgData)
        return imgData
}

/*
get the prediction 
*/
getFrame = () => {
    //make sure we have at least two recorded coordinates 
    if (coords.length >= 2) {

        //get the image data from the canvas 
        const imgData = getImageData()

        //get the prediction 
        const pred = model.predict(preprocess(imgData)).dataSync()

        //find the top 5 predictions 
        const indices = findIndicesOfMax(pred, 5)
        const probs = findTopValues(pred, 5)
        const names = getClassNames(indices)

        //set the guesses 
        setGuesses(names, probs)
    }

}

/*
get the the class names 
*/
getClassNames = (indices) => {
    var outp = []
    for (var i = 0; i < indices.length; i++)
        outp[i] = classNames[indices[i]]
    return outp
}

/*
load the class names from file
*/

async function loadClassFile() {
  
    loc = 'model/class_names.txt'

    await $.ajax({
        url: loc,
        dataType: 'text',
    }).done(loadClassNames);
}


loadClassNames = (data) => {
    
   const lst = data.split(/\n/);
    
    for (var i = 0; i <= lst.length - 1; i++) {
        let symbol = lst[i]
        //console.log("category :", lst[i])
        classNames[i] = symbol
    }
}

/*
get indices of the top probs
*/
findIndicesOfMax = (inp, count) => {
    var outp = [];
    for (var i = 0; i < inp.length; i++) {
        outp.push(i); // add index to output array
        if (outp.length > count) {
            outp.sort(function(a, b) {
                return inp[b] - inp[a];
            }); // descending sort the output array
            outp.pop(); // remove the last index (index of smallest element in output array)
        }
    }
    return outp;
}

/*
find the top 5 predictions
*/
findTopValues = (inp, count) => {
    var outp = [];
    let indices = findIndicesOfMax(inp, count)
    // show 5 greatest scores
    for (var i = 0; i < indices.length; i++)
        outp[i] = inp[indices[i]]
    return outp
}

/*
preprocess the data
*/
preprocess = (imgData) => {
    return tf.tidy(() => {
        //convert to a tensor 
        let tensor = tf.browser.fromPixels(imgData, numChannels = 1)
        
        //resize 
        const resized = tf.image.resizeBilinear(tensor, [28, 28]).toFloat()

        console.log(resized)
        
        //normalize 
        const offset = tf.scalar(255.0);
        const normalized = tf.scalar(1.0).sub(resized.div(offset));

        //We add a dimension to get a batch shape 
        const batched = normalized.expandDims(0)
        return batched
    })
}

/*
load the model
*/
async function start() {
    
    //load the model 
    model = await tf.loadLayersModel('model/model.json')

    
    //warm up 
    model.predict(tf.zeros([1, 28, 28, 1]))
    
    //allow drawing on the canvas 
    allowDrawing()
    
    //load the class names
    await loadClassFile()
}

/*
allow drawing on canvas
*/
allowDrawing = () => {
    canvas.isDrawingMode = 1;
    //document.getElementById('status').innerHTML = 'Model Loaded';
    $('button').prop('disabled', false);
}

/*
clear the canvs 
*/
erase = () => {
    canvas.clear();
    canvas.backgroundColor = '#fff';
    coords = [];
    guess.innerHTML = "";
}