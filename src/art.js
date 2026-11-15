import { getCharacter } from './characters.js';
// Original little pixel drawings, kept as editable vectors with a fixed pixel grid.
export function pixelIcon(name) {
  const dark='#6c3d25',wood='#b97939',gold='#efb84d',paper='#fff2c7',green='#71944c',blue='#78bac4';
  const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const art={
    folder:`${rect(2,6,20,15,dark)}${rect(3,3,9,4,wood)}${rect(4,8,16,11,gold)}${rect(6,11,12,1,paper)}${rect(6,15,8,1,paper)}`,
    calendar:`${rect(3,4,18,18,dark)}${rect(5,9,14,11,paper)}${rect(5,6,14,3,'#b86a43')}${rect(7,2,2,6,wood)}${rect(15,2,2,6,wood)}${rect(7,12,3,2,green)}${rect(13,12,3,2,green)}${rect(7,16,3,2,wood)}${rect(13,16,3,2,wood)}`,
    meter:`${rect(3,3,18,18,dark)}${rect(5,5,14,14,wood)}${rect(7,7,10,6,blue)}${rect(9,8,1,4,dark)}${rect(13,8,1,4,dark)}${rect(8,16,3,2,gold)}${rect(14,16,3,2,green)}`,
    notice:`${rect(2,2,20,18,dark)}${rect(4,4,16,14,wood)}${rect(6,6,6,8,paper)}${rect(14,7,5,9,'#c5d49a')}${rect(8,6,2,2,'#ac5d39')}${rect(5,20,2,3,dark)}${rect(17,20,2,3,dark)}`,
    shoes:`${rect(2,18,20,3,wood)}${rect(3,12,8,5,'#b76b3b')}${rect(3,9,4,4,'#b76b3b')}${rect(13,12,8,5,green)}${rect(13,9,4,4,green)}${rect(3,16,8,1,paper)}${rect(13,16,8,1,paper)}`,
    roommate:`${rect(4,4,7,7,'#e1af78')}${rect(13,4,7,7,'#e1af78')}${rect(3,3,9,3,dark)}${rect(13,3,8,3,dark)}${rect(2,12,10,10,green)}${rect(13,12,10,10,'#bf8559')}${rect(6,12,3,4,paper)}${rect(16,12,3,4,paper)}`,
    home:`<path d="M2 10h2V8h2V6h3V4h6v2h3v2h2v2h2v3h-3v8H5v-8H2z" fill="${dark}"/><path d="M5 10h2V8h3V6h4v2h3v2h2v2H5z" fill="#c46b3a"/>${rect(7,13,10,7,paper)}${rect(10,15,4,6,wood)}`,
    note:`${rect(4,2,16,20,dark)}${rect(7,4,11,16,paper)}${rect(5,4,2,16,wood)}${rect(9,7,7,1,wood)}${rect(9,10,7,1,wood)}${rect(9,13,7,1,wood)}${rect(9,16,4,1,wood)}${rect(15,2,3,6,'#ab633b')}`,
    person:`${rect(8,2,8,3,dark)}${rect(6,5,12,8,'#efbd80')}${rect(7,4,10,3,dark)}${rect(8,8,2,2,dark)}${rect(14,8,2,2,dark)}${rect(10,12,4,1,wood)}${rect(5,14,14,8,green)}${rect(10,14,4,5,paper)}`,
    sink:`${rect(4,12,16,3,blue)}${rect(5,15,14,3,dark)}${rect(7,18,2,4,wood)}${rect(15,18,2,4,wood)}${rect(11,5,2,8,dark)}${rect(12,3,5,2,dark)}${rect(16,5,2,3,dark)}${rect(8,13,8,2,paper)}`,
    cabinet:`${rect(4,2,16,19,dark)}${rect(6,4,5,15,wood)}${rect(13,4,5,15,'#dca764')}${rect(9,10,1,4,gold)}${rect(14,10,1,4,gold)}${rect(5,21,3,2,dark)}${rect(16,21,3,2,dark)}`,
    sofa:`${rect(4,7,16,11,dark)}${rect(6,5,12,10,green)}${rect(2,12,4,8,wood)}${rect(18,12,4,8,wood)}${rect(6,15,12,5,'#a2b46c')}${rect(4,20,3,2,dark)}${rect(17,20,3,2,dark)}`,
    bathroom:`${rect(12,3,8,8,dark)}${rect(14,5,4,4,paper)}${rect(4,11,16,3,blue)}${rect(6,14,12,4,paper)}${rect(9,18,7,3,paper)}${rect(7,21,12,2,dark)}`,
    phone:`${rect(6,1,12,22,dark)}${rect(8,4,8,14,'#a4c484')}${rect(10,2,4,1,gold)}${rect(11,20,2,1,paper)}${rect(10,8,2,5,green)}${rect(12,12,3,2,green)}`,
    sun:`<path d="M10 0h4v3h-4zM10 21h4v3h-4zM0 10h3v4H0zM21 10h3v4h-3zM3 3h3v3H3zM18 3h3v3h-3zM3 18h3v3H3zM18 18h3v3h-3z" fill="${gold}"/><path d="M8 4h8v2h2v2h2v8h-2v2h-2v2H8v-2H6v-2H4V8h2V6h2z" fill="#e89c35"/>${rect(8,7,8,9,'#ffd966')}${rect(7,9,10,5,'#ffd966')}`,
    check:`<path d="M3 11h3v3h3v3h3v-3h3v-3h3V8h3V5h-4v3h-3v3h-3v3H9v-3H6V8H3z" fill="${green}"/>`,
    arrow:`<path d="M3 10h12V5h3v3h3v3h2v2h-2v3h-3v3h-3v-5H3z" fill="${dark}"/>`,
    close:`<path d="M5 3h3v3h3v3h2V6h3V3h3v5h-3v3h-3v2h3v3h3v5h-3v-3h-3v-3h-2v3H8v3H5v-5h3v-3h3v-2H8V8H5z" fill="${dark}"/>`,
    move:`<path d="M10 1h4v3h3v3h-3v3h3v-3h3v3h3v4h-3v3h-3v-3h-3v3h3v3h-3v3h-4v-3H7v-3h3v-3H7v3H4v-3H1v-4h3V7h3v3h3V7H7V4h3z" fill="${wood}"/>`,
    help:`${rect(5,3,14,3,dark)}${rect(4,6,4,3,dark)}${rect(15,6,4,5,dark)}${rect(11,10,6,3,dark)}${rect(10,12,4,4,dark)}${rect(10,19,4,3,wood)}`,
    sound:`<path d="M2 9h5V6h3V3h3v18h-3v-3H7v-3H2z" fill="${wood}"/>${rect(16,7,2,10,green)}${rect(20,4,2,16,green)}`,
    mute:`<path d="M2 9h5V6h3V3h3v18h-3v-3H7v-3H2z" fill="${wood}"/><path d="M16 8h2v2h2V8h2v4h-2v2h2v4h-2v-2h-2v2h-2v-4h2v-2h-2z" fill="#b66b49"/>`,
  };
  return `<svg viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${art[name]||art.note}</svg>`;
}

export function portraitSvg(expression='neutral', speaker='agent', profile=null) {
  if(speaker==='self')return `<svg viewBox="0 0 64 64" shape-rendering="crispEdges" aria-hidden="true"><path fill="#d9bd7a" d="M0 0h64v64H0z"/><path fill="#719651" d="M4 48h56v12H4zM7 44h3v7H7zM52 41h4v10h-4z"/><path fill="#76472c" d="M15 10h34v41H15z"/><path fill="#fff0bc" d="M21 13h25v34H21z"/><path fill="#ca9248" d="M17 13h4v34h-4zM26 20h15v2H26zM26 27h15v2H26zM26 34h10v2H26z"/><path fill="#677f46" d="M38 37h12v3H38zM35 40h3v9h-3zM50 40h3v9h-3zM38 49h12v3H38zM50 52h4v4h-4zM54 56h4v4h-4z"/></svg>`;

  const actor=getCharacter(profile||({owner:'周女士',friend:'小满',roommate:'阿宁'}[speaker]||'小陈'));
  const {gender,hairStyle,hair,shirt,skin,outfit,accessory}=actor;
  const smile=['smile','relieved'].includes(expression),tense=expression==='tense',avoid=expression==='avoid';
  const longHair=['bob','long','ponytail','bun'].includes(hairStyle);
  const hairBack=hairStyle==='long'?'M15 9h32v5h4v39H12V18h3z':hairStyle==='ponytail'?'M16 9h31v7h5v18h5v20H46V25H15z':hairStyle==='bun'?'M19 8h25v7h5v27H14V18h5zM25 2h14v10H25z':hairStyle==='bob'?'M18 9h27v5h5v31H13V19h5z':'M18 8h28v5h4v19H15V16h3z';
  const fringe=hairStyle==='sidepart'?'M16 14h31v6H33v5H22v4h-6z':hairStyle==='short'?'M17 13h29v10H17zM17 20h5v8h-5z':hairStyle==='shortbob'?'M17 12h29v7h4v20h-5V23h-9v-4H25v6h-7v14h-4V19h3z':'M17 13h29v8H33v-4h-5v8H18v10h-4V20h3z';
  return `<svg viewBox="0 0 64 64" shape-rendering="crispEdges" aria-hidden="true" data-gender="${gender}" data-hair="${hairStyle}">
    <path fill="#d8dbba" d="M0 0h64v64H0z"/><path fill="#ede5c2" d="M4 4h10v3H4zM48 6h9v3h-9zM5 41h7v3H5z"/>
    <path fill="${hair}" d="${hairBack}"/>
    <path fill="${skin}" d="${gender==='男'?'M20 18h26v23h-4v7H25v-6h-5z':'M22 18h23v22h-4v7H27v-5h-5z'}"/>
    <path fill="#f5c994" d="M25 20h18v17h-3v7H29v-5h-4z"/><path fill="#c38d64" d="M18 27h5v8h-5zM45 27h4v8h-4zM27 43h13v9H27z"/>
    <path fill="${shirt}" d="${gender==='男'?'M17 48h10v3h13v-3h9v5h7v11H8V54h9z':'M20 48h8v3h11v-3h7v5h8v11H11V55h9z'}"/>
    ${outfit==='jacket'?'<path fill="#f3e5c6" d="M27 48h4v5h4v-5h5v7h-3v9H29V55h-2z"/><path fill="#4d5144" d="M22 49h4v5h3v10h-3V56h-4zM42 49h4v7h-4v8h-3V54h3z"/>':'<path fill="#dbc9a6" d="M27 48h4v4h5v-4h4v7H27z"/>'}
    <path fill="${hair}" d="${fringe}"/>
    ${longHair&&gender==='女'?'<path fill="#6b4b35" opacity=".35" d="M16 22h2v21h-2zM46 20h2v21h-2z"/>':''}
    <g transform="translate(${avoid?-2:0} 0)"><path fill="#423529" d="M25 ${smile?30:28}h4v${smile?2:5}h-4zM38 ${smile?30:28}h4v${smile?2:5}h-4z"/>${!smile?'<path fill="#fff0cd" d="M25 28h1v2h-1zM38 28h1v2h-1z"/>':''}</g>
    <path fill="${hair}" d="${tense?'M23 24h4v1h4v2h-4v-1h-4zM37 25h4v-1h4v2h-4v1h-4z':'M24 24h7v1h-7zM37 24h7v1h-7z'}"/>
    <path fill="#cb956a" d="M32 32h3v4h-3z"/>
    <path fill="#8d5139" d="${smile?'M30 38h10v2h-2v2h-6v-2h-2z':tense?'M31 39h8v2h-8z':'M31 39h7v1h-7z'}"/>
    ${accessory==='cap'?'<path fill="#c5a15f" d="M18 7h27v10H18zM11 17h42v5H11z"/><path fill="#8b7298" d="M18 14h27v3H18z"/>':accessory==='earrings'?'<path fill="#e9bd5a" d="M18 35h3v5h-3zM46 35h3v5h-3z"/>':accessory==='glasses'?'<path fill="#675c43" d="M23 27h9v1h5v-1h9v9h-9v-7h-5v7h-9z"/><path fill="#efdfbd" d="M25 29h5v5h-5zM39 29h5v5h-5z"/><path fill="#423529" d="M27 30h2v3h-2zM40 30h2v3h-2z"/>':''}
    ${tense?'<path fill="#95ccd5" d="M48 22h2v3h2v5h-4z"/>':''}
  </svg>`;
}
