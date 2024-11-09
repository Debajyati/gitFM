import cfonts from "cfonts";

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const fontStyles = ['chrome','slick','grid','shade','tiny','pallet'];
const randomFontStyle = fontStyles[getRandomIntInclusive(0, fontStyles.length - 1)];
const options = {
	font: randomFontStyle,              // define the font face
	align: 'center',              // define text alignment
	colors: ['greenBright', 'magentaBright', 'redBright'],         // define all colors
	background: 'transparent',  // define the background color, you can also use `backgroundColor` here as key
	letterSpacing: 1,           // define letter spacing
	lineHeight: 1,              // define the line height
	space: true,                // define if the output text should have empty lines on top and on the bottom
	maxLength: '0',             // define how many character can be on one line
	gradient: true,            // define your two gradient colors
	independentGradient: false, // define if you want to recalculate the gradient for each new line
	transitionGradient: false,  // define if this is a transition between colors directly
	rawMode: false,             // define if the line breaks should be CRLF (`\r\n`) over the default LF (`\n`)
	env: 'node'                 // define the environment cfonts is being executed in
};

const sexy = cfonts.render('GITFM',options);

const headerText = sexy.string;

export { headerText };
