
const fs = require("fs");
const URLLIB = require('url')

const request = require('request')
const htmlparser2 = require('htmlparser2')

// Default config
const config = {
	dlpath: "C:/Downloads/Albums",
	feedUrl: "https://www.fakemusicgenerator.com/",
};

/*
let loadedGrabbed;
try { 
	loadedGrabbed = fs.readFileSync("grabbed.json")
	if (loadedGrabbed) {
		loadedGrabbed = loadedGrabbed.toString("utf8")
	}
} catch (err) { 
	loadedGrabbed = null
}

const grabbed = (loadedGrabbed) ? JSON.parse(loadedGrabbed) : {};

process.on("SIGINT", () => process.exit())
process.on("exit", () => {
	console.log("Actually exiting now");
	fs.writeFileSync("grabbed.json", JSON.stringify(grabbed, null, 4))
	console.log("Done saving, bye");
})
//*/


function regexFor(title, resolution) {
	const filledTemplate = template.map((it) => {
		if (it === "TITLE") { return title; }
		if (it === "RESOLUTION") { return resolution; }
		return it;
	})

	return new RegExp(filledTemplate.join(""), "g");
}

function download(url, destination) {
	const base = URLLIB.parse(config.feedUrl);
	var opts = {
		url: base.protocol + "//" + base.hostname + url,
		timeout: config.requestTimeOut,
		encoding: null,
	}
	console.log(`${opts.url} => ${destination}`)
	request.get(opts, (err, res, body) => {
		if (err) {
			console.error("Error Downloading:")
			console.error(err);
		}
		console.log(`Wrote ${destination}`)
		fs.writeFile(destination, body, err2 => {
			if (err2) {
				console.error("Error Writing file:")
				console.error(err2)
			}
		})
	})
}
function mkdir(dir) {
	if (!fs.existsSync(dir)){
		fs.mkdirSync(dir);
	}
}

function FakeMusicBot() {
	
	let album = "";
	let artist = "";
	let trackName = "";
	let trackNum = 0;
	let art = "";
	
	let markedForTitle = false;
	let nextText = null;
	let tdCount = 0;
	let grabLinks = 0;
	
	const callbacks = {
		onopentag(name, attr) {
			//console.log(`<${name} ${JSON.stringify(attr)}>`) 
			if (name === "img") {
				let src = attr["src"] || "--Skip";
				if (src != "--Skip") {
					art = src;
					markedForTitle = true;
				}
				
			}
			if (name === "span") {
				if (markedForTitle) {
					markedForTitle = false;
					nextText = (it) => { 
						album = it;
						console.log(`Title: "${it}"`); 
						mkdir(config.dlpath+`/${album}`);
						if (art !== "") {
							download(art, config.dlpath+`/${album}/cover.jpg`)
						}
					}
				}
			}
			if (name === "tr") {
				if (album && artist) {
					if (!attr.class || attr.class === "trackOdd") {
						markedForLink = true;
						tdCount = 0;
					}
				}
			}
			if (name === "td") {
				if (tdCount == 0) { // Track#
					nextText = (it) => {
						trackNum = it; 
						console.log(`Track#: "${it}"`); 
					}	
				} 
				if (tdCount == 1) { // Track Title
					nextText = (it) => { 
						trackName = it;
						console.log(`TrackName: "${it}"`); 
					}
				}
				if (tdCount == 2) { } // Track Length
				if (tdCount == 3) { // links
					grabLinks = 2;
				}
				
				
				tdCount++;
			}
			if (name === "a") {
				if (grabLinks > 0) {
					grabLinks -= 1;
					
					console.log("Downloading : " + JSON.stringify(attr))
					let ext = attr.href.includes("type=mp3") ? "mp3" : "midi"
					download(attr.href, config.dlpath+`/${album}/${trackNum} - ${artist} - ${trackName}.${ext}`)
				}
			}
		},
		ontext(text) {  
			
			if (nextText) { 
				nextText(text);
				nextText = null;
			} else {
				if (text.indexOf("by ") == 0) {
					artist = text.substring(3);
				}
			}
		},
		onclosetag(name) { }
	}
	for (c in callbacks) { callbacks[c].bind(this) }
	
	this.parse = function(body) {
		const parser = new htmlparser2.Parser(callbacks, { decodeEntities: true })
		parser.parseComplete(body)
	}
}

let bot = new FakeMusicBot()
let waiting = false;
function check() {
	if (!waiting) {
		console.log(new Date())
		console.log("checking")
		
		waiting = true;
		var opts = {
			url: config.feedUrl,
			timeout: config.requestTimeOut
		}
		request(opts, (err, res, body) => {
			waiting = false;
			if (err) {
				console.log(err);
				return
			}
			var code = res.statusCode;
			// console.log(code);

			try {
				bot.parse(body)

			} catch (err) {
				console.log("ERROR:");
				console.log(err);
			}
			//console.log(body.substring(0, Math.min(1000, body.length)))


		})
	}
}

check();

/*
setInterval(() => { check(); }, config.checkInterval);
setInterval(() => { 
	fs.writeFile("grabbed.json", JSON.stringify(grabbed, null, 4), (err) => {
		if (err) { console.error(err); }
	})
}, config.saveInterval)

//*/

