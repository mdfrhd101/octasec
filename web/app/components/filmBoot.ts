// The intro film's own script, inlined in the homepage's HTML right after its markup (BreachIntro), so it runs before the
// JS bundle arrives and isn't part of it. On a slow link the bundle takes many seconds; the film doesn't wait for it, and
// without it the visitor still ends up on the hero.
//
// It places the frame, picks a file for this screen and this connection, plays it and hands over:
//   load -> play -> end -> (BreachIntro takes over: the mark's flight into the hero)
// The whole file is fetched first, at high priority, and only then played: a film that is all in memory can't stall, whatever
// the connection does, and needs no range requests. The browser plays it by itself and CSS runs everything on top
// (breach-scroll.css, html.bxi-play), so a busy main thread can't make it stutter. Encodes: docs/SCROLL_ANIMATION_PLAN.md.
//
// TIERS: [name, KB, kbps the stylesheets must have shown to try it]. That reading is low on a fast link (they are small, so
// round trips dominate), so it only rules out the slow links; the download itself decides after that.
// The 2560px file is only for devices that decode it without dropping frames: hardware decoding, or a desktop CPU with 8+ cores.
// Firefox drops frames at that size even on fast machines (30 of 138 in tests, 2 of 138 at 1600px), so it stops at 1600px.
// WAIT: longest the visitor should wait for a better file while a smaller one exists (ms).
// LIMIT: no film by then, from navigation start, means a dead link: go to the hero (ms). HOLD: how long the last frame
// waits for BreachIntro if the bundle is late or failed (ms).
const TIERS = '[["x",1053,700],["d",647,700],["m",270,350],["s",139,0]]';
const WAIT = 3000;
const LIMIT = 15000;
const HOLD = 2500;
const POSTER = "data:image/webp;base64,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";

export const FILM_BOOT = `(function(){
var d=window,h=document.documentElement,c=h.classList,root=document.querySelector(".bxi"),v=root&&root.querySelector("video");
try{
if(!v||matchMedia("(prefers-reduced-motion: reduce)").matches){c.remove("bxi-slow");return}
c.add("bxi-on");
var D=4.6,T=${TIERS},last=T.length-1,st=root.querySelector(".bx-stage"),fl=root.querySelector(".bx-film"),mk=root.querySelector(".bx-mark"),br=root.querySelector(".bx-bar"),base,L,H,E,I,B,U,R=0,P=0,ctl,o={passive:true};
var fit=function(w,y){
var sw=.72,sh=.48375,a=.5625,f,x,t;
if(y>w){f=Math.min(Math.max(w,y/a),w/sw);t=Math.min(96,y*.12);var g=Math.max(t,t+(y-t-(sh*f+154))/2);x=(w-sw*f)/2-.14*f;t=g-.04*f*a}
else{var e=Math.min(Math.max(y*.18,110),200),u=w*.04,m=w-2*u,n=y-e-y*.03;f=Math.min(Math.max(w,y/a),m/sw,n/sh);x=u+(m-sw*f)/2-.14*f;t=y*.03+(n-sh*f)/2-.04*f*a}
var q=f*a;if(f>=w)x=Math.min(0,Math.max(w-f,x));if(q>=y)t=Math.min(0,Math.max(y-q,t));return{x:x,y:t,w:f,h:q}};
var S=d.__bxi={state:"load",fly:null,left:0,
ring:function(){var z=1.05,w=base.w*z,q=base.h*z,x=base.x+.5*base.w-.5*base.w*z,y=base.y+.47*base.h-.47*base.h*z;return{x:x+.5*w,y:y+.504*q,s:.207*w}},
take:function(f){S.fly=f;if(f&&S.state==="end"){clearTimeout(H);leave(false)}},
stop:function(){if(S.state==="gone")return;S.state="gone";R++;clearTimeout(L);clearTimeout(H);clearTimeout(E);if(ctl)ctl.abort();root.removeEventListener("pointerdown",sk);d.removeEventListener("wheel",sk);d.removeEventListener("touchmove",sk);d.removeEventListener("keydown",key);d.removeEventListener("resize",layout);document.removeEventListener("visibilitychange",arm);document.removeEventListener("visibilitychange",wake);c.remove("bxi-hold");try{v.pause();v.removeAttribute("src");v.load();if(B)URL.revokeObjectURL(B)}catch(e){}delete d.__bxi}};
function layout(){
var w=st.clientWidth,y=st.clientHeight,s=fl.style;base=fit(w,y);st.classList.toggle("is-stacked",y>w);
s.left=base.x+"px";s.top=base.y+"px";s.width=base.w+"px";s.height=base.h+"px";s.setProperty("--fe",Math.min(base.w,base.h)*.08+"px");
if(!S.left){var g=S.ring();mk.style.width=mk.style.height=g.s+"px";mk.style.transform="translate3d("+g.x+"px,"+g.y+"px,0) translate(-50%,-50%)"}}
function bail(){S.stop();c.remove("bxi-slow");c.add("bxi-bail");setTimeout(function(){c.remove("bxi-on","bxi-play","bxi-bail")},350)}
function leave(k){if(S.state==="gone"||S.left)return;if(S.fly){S.left=1;S.fly(k)}else if(k)bail()}
function sk(){leave(true)}
function key(e){if(["Escape","Enter"," ","ArrowDown","PageDown"].indexOf(e.key)>=0){e.preventDefault();sk()}}
function arm(){if(document.hidden||S.state!=="load")return;clearTimeout(L);L=setTimeout(function(){if(document.hidden)return;if(P>.5){P=0;L=setTimeout(sk,5000);return}sk()},Math.max(4000,${LIMIT}-performance.now()))}
function wake(){if(!document.hidden&&S.state==="play"&&v.paused)play()}
function can(s){return v.canPlayType('video/mp4; codecs="'+s+'"')}
function play(){var p=v.play();if(p&&p.catch)p.catch(function(e){if(e&&e.name==="NotAllowedError")sk()})}
function rate(){
var b=0,a=1e12,z=0;
try{performance.getEntriesByType("resource").forEach(function(e){if(e.initiatorType==="link"&&e.transferSize>0&&e.name.indexOf(location.origin)===0&&e.responseEnd>0){b+=e.encodedBodySize||e.transferSize;a=Math.min(a,e.startTime);z=Math.max(z,e.responseEnd)}})}catch(e){}
if(b>8192&&z>a)return b*8/(z-a);
var n=navigator.connection;return n&&n.downlink?n.downlink*500:0}
function bar(k){br.style.clipPath="inset(0 "+((1-k)*100).toFixed(1)+"% 0 0)"}
function load(){
var k=Q[0],u=U="/anim/breach/film-"+(k==="h264"?"m":T[I][0])+"."+k+".mp4",me=++R,t0=performance.now();
function ready(b){if(me!==R)return;B=URL.createObjectURL(b);v.src=B;play()}
function fail(){if(me===R){v.src=u;play()}}
if(!d.fetch||!d.AbortController)return fail();
ctl=new AbortController();
fetch(u,{priority:"high",signal:ctl.signal}).then(function(r){
if(me!==R)return;if(!r.ok)return fail();
var rd=r.body&&r.body.getReader&&r.body.getReader(),len=+r.headers.get("content-length")||0,got=0,parts=[];
if(!rd)return r.blob().then(ready);
(function next(){rd.read().then(function(x){
if(me!==R)return;
if(x.done)return ready(new Blob(parts,{type:"video/mp4"}));
parts.push(x.value);got+=x.value.length;
if(len){P=got/len;bar(P);
var e=performance.now()-t0;
if(I<last&&k!=="h264"&&e>700&&(len-got)/(got/e)>${WAIT}){var j=I+1;while(j<last&&T[j][1]*1024/(got/e)>${WAIT})j++;I=j;ctl.abort();return load()}}
next()}).catch(fail)})()
}).catch(fail)}
var Q=[];if(can("av01.0.08M.10"))Q.push("av1");if(can("hvc1.2.4.L120.B0"))Q.push("hevc");Q.push("h264");
var r=S.kbps=rate(),n=navigator.connection,slow=n&&n.saveData||r&&r<T[2][2];
if(!slow)c.remove("bxi-slow");
layout();
var px=base.w*Math.min(d.devicePixelRatio||1,2);
I=Math.min(d.innerWidth,d.innerHeight)<=600?2:px>2000?0:px>854?1:2;
if(n&&n.saveData)I=last;else if(r)while(I<last&&r<T[I][2])I++;
root.addEventListener("pointerdown",sk);d.addEventListener("wheel",sk,o);d.addEventListener("touchmove",sk,o);d.addEventListener("keydown",key);d.addEventListener("resize",layout);document.addEventListener("visibilitychange",arm);
v.addEventListener("playing",function(){c.remove("bxi-hold");if(S.state==="load"){S.state="play";clearTimeout(L);br.style.clipPath="";c.add("bxi-play")}if(S.state==="play"){clearTimeout(E);E=setTimeout(sk,(D-v.currentTime+4)*1000)}});
v.addEventListener("pause",function(){if(S.state==="play"&&!v.ended){c.add("bxi-hold");clearTimeout(E)}});
document.addEventListener("visibilitychange",wake);
v.addEventListener("ended",function(){clearTimeout(E);if(S.state==="gone")return;S.state="end";if(S.fly)leave(false);else H=setTimeout(bail,${HOLD})});
v.addEventListener("error",function(){if(S.state==="gone"||!v.getAttribute("src"))return;
if(B){URL.revokeObjectURL(B);B=0;v.src=U;play();return}
Q.shift();if(Q.length)load();else sk()});
v.muted=true;v.defaultMuted=true;v.playsInline=true;v.preload="auto";v.disableRemotePlayback=true;v.poster="${POSTER}";
arm();
var mc=navigator.mediaCapabilities,core=(navigator.hardwareConcurrency||0)>=8&&!navigator.maxTouchPoints;
if(I!==0)load();
else if(CSS.supports("-moz-appearance","none")){I=1;load()}
else if(mc&&mc.decodingInfo)mc.decodingInfo({type:"file",video:{contentType:Q[0]==="av1"?'video/mp4;codecs="av01.0.12M.10"':'video/mp4;codecs="hvc1.2.4.L150.B0"',width:2560,height:1440,bitrate:2e6,framerate:30}}).then(function(i){if(!i.powerEfficient&&!core)I=1},function(){if(!core)I=1}).then(function(){if(S.state==="load")load()});
else{if(!core)I=1;load()}
}catch(e){c.remove("bxi-on","bxi-play","bxi-slow");if(d.__bxi)delete d.__bxi}
})();`;
