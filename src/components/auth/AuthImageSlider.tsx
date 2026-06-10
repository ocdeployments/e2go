"use client";

export default function AuthImageSlider() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a] hidden md:block">
      {/* American flag SVG — copied from HomeClient.tsx */}
      <svg width="100%" height="100%" viewBox="0 0 660 520" preserveAspectRatio="xMinYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="authFlagFadeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{stopColor:'#0a0a0a',stopOpacity:0.6}}/>
            <stop offset="60%" style={{stopColor:'#0a0a0a',stopOpacity:0.15}}/>
            <stop offset="100%" style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
          </linearGradient>
          <linearGradient id="authFlagFadeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="85%" style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
            <stop offset="100%" style={{stopColor:'#0a0a0a',stopOpacity:0.85}}/>
          </linearGradient>
        </defs>
        {[0,80,160,240,320,400,480].map((y,i) => <rect key={`r${i}`} width="660" height="40" y={y} fill="#BF0A30"/>)}
        {[40,120,200,280,360,440].map((y,i) => <rect key={`w${i}`} width="660" height="40" y={y} fill="#e6e6e6"/>)}
        <rect width="264" height="280" y="0" fill="#002868"/>
        {[
          [18,14],[50,14],[82,14],[114,14],[146,14],[178,14],[210,14],[242,14],
          [34,40],[66,40],[98,40],[130,40],[162,40],[194,40],[226,40],
          [18,66],[50,66],[82,66],[114,66],[146,66],[178,66],[210,66],[242,66],
          [34,92],[66,92],[98,92],[130,92],[162,92],[194,92],[226,92],
          [18,118],[50,118],[82,118],[114,118],[146,118],[178,118],[210,118],[242,118],
          [34,144],[66,144],[98,144],[130,144],[162,144],[194,144],[226,144],
          [18,170],[50,170],[82,170],[114,170],[146,170],[178,170],[210,170],[242,170],
          [34,196],[66,196],[98,196],[130,196],[162,196],[194,196],[226,196],
          [18,222],[50,222],[82,222],[114,222],[146,222],[178,222],[210,222],[242,222],
          [34,248],[66,248],[98,248],[130,248],[162,248],[194,248],[226,248],
        ].map(([cx,cy],i) => {
          const r=9,ir=4;
          const pts=Array.from({length:5},(_,k)=>{
            const a=(k*72-90)*Math.PI/180;
            const b=(k*72-90+36)*Math.PI/180;
            return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)} ${cx+ir*Math.cos(b)},${cy+ir*Math.sin(b)}`;
          }).join(' ');
          return <polygon key={i} points={pts} fill="#FFFFFF"/>;
        })}
        <rect width="660" height="520" fill="url(#authFlagFadeLeft)"/>
        <rect width="660" height="520" fill="url(#authFlagFadeBottom)"/>
      </svg>

      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(10,10,10,0.25)" }} />

      {/* Gold text — bottom left */}
      <div className="absolute bottom-8 left-8 hidden lg:block">
        <p style={{ color: "rgba(245,240,232,0.6)", fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: "12px", letterSpacing: "0.08em" }}>
          E2go — U.S. E-2 Treaty Investor Visa Preparation
        </p>
      </div>
    </div>
  );
}
