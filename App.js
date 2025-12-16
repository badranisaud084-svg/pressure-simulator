// التطبيق الرئيسي باستخدام React
const { useState, useEffect, useRef } = React;

function App() {
    const [params, setParams] = useState({
        p_res: 3000,
        water_cut: 20,
        api: 30,
        tid: 2.5,
        rate: 1000,
        gas_rate: 0
    });

    const [results, setResults] = useState(null);
    const pressureEngine = new PressureEngine();
    const iprRef = useRef(null);
    const schematicRef = useRef(null);

    useEffect(() => {
        updateAnalysis();
    }, []);

    const updateAnalysis = () => {
        // حساب ضغط البئر
        const traverse = pressureEngine.calculateTraverse(
            params.p_res, params.water_cut, params.api, 
            params.tid, params.rate, params.gas_rate
        );
        
        // حساب منحنى IPR
        const iprCurve = IPRCalculator.generateIPRCurve(params.p_res, 2000, 5.0);
        
        setResults({ traverse, iprCurve });
        updatePlots(traverse, iprCurve);
        updateSchematic(traverse);
    };

    const updatePlots = (traverse, iprCurve) => {
        // رسم ضغط البئر
        const pressureTrace = {
            x: traverse.pressure,
            y: traverse.depth,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#00ffff', width: 4 },
            fill: 'tozerox',
            fillcolor: 'rgba(0, 255, 255, 0.1)',
            name: 'ضغط البئر'
        };

        Plotly.newPlot('pressure-plot', [pressureTrace], {
            title: {
                text: 'ملف ضغط البئر النزولي',
                font: { family: 'Orbitron', size: 18, color: '#00ffff' }
            },
            xaxis: {
                title: 'الضغط (psi)',
                gridcolor: '#1e2d4a',
                color: '#8892b0'
            },
            yaxis: {
                title: 'العمق (ft)',
                gridcolor: '#1e2d4a',
                color: '#8892b0',
                autorange: 'reversed'
            },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e0e6ed' },
            shapes: [
                {
                    type: 'line',
                    x0: traverse.pwf, x1: traverse.pwf,
                    y0: 0, y1: 8000,
                    line: { color: '#ff6b35', width: 2, dash: 'dot' }
                },
                {
                    type: 'line',
                    x0: params.p_res, x1: params.p_res,
                    y0: 0, y1: 8000,
                    line: { color: '#ffd166', width: 2, dash: 'dash' }
                }
            ],
            annotations: [
                {
                    x: params.p_res,
                    y: 4000,
                    text: `ضغط المكمن: ${params.p_res.toFixed(0)} psi`,
                    showarrow: true,
                    arrowcolor: '#ffd166',
                    font: { color: '#ffd166' }
                }
            ]
        }, { responsive: true });

        // رسم IPR
        const vogelTrace = {
            x: iprCurve.vogel.map(d => d.rate),
            y: iprCurve.vogel.map(d => d.pwf),
            type: 'scatter',
            mode: 'lines',
            line: { color: '#e74c3c', width: 3 },
            name: 'Vogel IPR'
        };

        const fetkovichTrace = {
            x: iprCurve.fetkovich.map(d => d.rate),
            y: iprCurve.fetkovich.map(d => d.pwf),
            type: 'scatter',
            mode: 'lines',
            line: { color: '#3498db', width: 3, dash: 'dash' },
            name: 'Fetkovitch IPR'
        };

        const operatingPoint = {
            x: [params.rate],
            y: [traverse.pwf],
            type: 'scatter',
            mode: 'markers',
            marker: {
                size: 15,
                color: '#00ff9d',
                symbol: 'star',
                line: { color: '#ffffff', width: 2 }
            },
            name: 'نقطة التشغيل'
        };

        Plotly.newPlot('ipr-plot', [vogelTrace, fetkovichTrace, operatingPoint], {
            title: {
                text: 'Inflow Performance Relationship',
                font: { family: 'Orbitron', size: 18, color: '#00ff9d' }
            },
            xaxis: {
                title: 'معدل الإنتاج (STB/D)',
                gridcolor: '#1e2d4a',
                color: '#8892b0'
            },
            yaxis: {
                title: 'ضغط التدفق (psi)',
                gridcolor: '#1e2d4a',
                color: '#8892b0'
            },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e0e6ed' },
            legend: {
                x: 0.7,
                y: 0.95,
                font: { color: '#e0e6ed' }
            }
        });
    };

    const updateSchematic = (traverse) => {
        // تحديث مقطع البئر المتحرك
        const fluidHeight = 600 * (0.8 + traverse.fluidSg * 0.2);
        const bubbleCount = Math.max(0, Math.floor((1 - traverse.fluidSg) * 30));
        
        // تحديث CSS للتدفق
        const fluidElement = document.querySelector('.fluid-fill');
        if (fluidElement) {
            fluidElement.style.height = `${fluidHeight}px`;
            fluidElement.style.background = `linear-gradient(to top, 
                rgba(${100 - traverse.fluidSg * 50}, ${150 - params.water_cut}, 
                ${200 * traverse.fluidSg}, 0.8), 
                rgba(${150 - traverse.fluidSg * 50}, ${200 - params.water_cut * 2}, 
                ${255 * traverse.fluidSg}, 0.6))`;
        }
    };

    const handleSliderChange = (key, value) => {
        setParams(prev => ({ ...prev, [key]: value }));
        // تحديث فوري
        setTimeout(updateAnalysis, 50);
    };

    if (!results) return <div className="loading">جاري التحميل...</div>;

    return (
        <div className="app-container">
            {/* لوحة التحكم */}
            <div className="control-panel">
                <h1>🛢️ محاكي ضغط الآبار</h1>
                
                {[
                    { key: 'p_res', label: 'ضغط المكمن', min: 1000, max: 6000, step: 50, unit: 'psi', color: '#00ffff' },
                    { key: 'water_cut', label: 'نسبة الماء', min: 0, max: 100, step: 1, unit: '%', color: '#ff6b35' },
                    { key: 'api', label: 'API النفط', min: 10, max: 50, step: 1, unit: '', color: '#00ff9d' },
                    { key: 'tid', label: 'قطر الأنبوب', min: 1.5, max: 4.5, step: 0.1, unit: 'in', color: '#9d4edd' },
                    { key: 'rate', label: 'معدل الإنتاج', min: 100, max: 5000, step: 50, unit: 'STB/D', color: '#ffd166' },
                    { key: 'gas_rate', label: 'معدل الغاز', min: 0, max: 2000, step: 50, unit: 'Mscf/D', color: '#ff9e6d' }
                ].map(control => (
                    <div key={control.key} className="control-group">
                        <div className="control-label">
                            <span>{control.label}</span>
                            <span className="control-value" style={{ borderColor: control.color }}>
                                {params[control.key].toFixed(1)} {control.unit}
                            </span>
                        </div>
                        <div className="slider-container">
                            <input
                                type="range"
                                id={control.key}
                                min={control.min}
                                max={control.max}
                                step={control.step}
                                value={params[control.key]}
                                onChange={(e) => handleSliderChange(control.key, parseFloat(e.target.value))}
                                style={{ '--thumb-color': control.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* لوحة العرض */}
            <div className="visual-panel">
                <div className="plot-container">
                    <h2>📈 ملف الضغط النزولي</h2>
                    <div id="pressure-plot" style={{ width: '100%', height: '100%' }}></div>
                    
                    {/* HUD Overlay */}
                    <div className="hud-overlay">
                        <div className="hud-item">
                            <div className="hud-label">السرعة</div>
                            <div className="hud-value" style={{ color: '#00ff9d' }}>
                                {results.traverse.velocity.toFixed(2)} ft/s
                            </div>
                        </div>
                        <div className="hud-item">
                            <div className="hud-label">الحالة</div>
                            <div className={`hud-value ${results.traverse.status.class}`}>
                                {results.traverse.status.text}
                            </div>
                        </div>
                        <div className="hud-item">
                            <div className="hud-label">ضغط الرأس</div>
                            <div className="hud-value" style={{ color: '#ff6b35' }}>
                                {results.traverse.whp.toFixed(1)} psi
                            </div>
                        </div>
                    </div>
                </div>

                <div className="plot-container" style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <h2>⚙️ منحنى IPR</h2>
                        <div id="ipr-plot" style={{ width: '100%', height: '100%' }}></div>
                    </div>
                    
                    <div style={{ flex: 0.4 }}>
                        <h2>🔬 مقطع البئر</h2>
                        <div className="wellbore-container">
                            <svg className="wellbore-svg" viewBox="0 0 200 600">
                                {/* Casing */}
                                <rect x="40" y="0" width="120" height="600" 
                                      fill="none" stroke="#7f8c8d" strokeWidth="8" rx="5"/>
                                {/* Tubing */}
                                <rect x="70" y="0" width="60" height="600" 
                                      fill="none" stroke="#2c3e50" strokeWidth="6" rx="3"/>
                                {/* Fluid Fill */}
                                <rect className="fluid-fill" x="72" y="100" width="56" height="400"
                                      fill="rgba(0, 255, 255, 0.6)" rx="2">
                                    <animate attributeName="y" values="100;80;100" dur="2s" repeatCount="indefinite"/>
                                </rect>
                                {/* Flow Arrow */}
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                                            refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#ffd166"/>
                                    </marker>
                                </defs>
                                <line x1="100" y1="500" x2="100" y2="150" 
                                      stroke="#ffd166" strokeWidth="4" 
                                      markerEnd="url(#arrowhead)" className="flow-animation"/>
                                {/* Gas Bubbles */}
                                {Array.from({length: Math.max(0, Math.floor((1 - results.traverse.fluidSg) * 8))}).map((_, i) => (
                                    <circle key={i} cx={85 + i * 5} cy={200 + i * 40} r="3" 
                                            fill="rgba(255, 255, 255, 0.7)" className="bubble"
                                            style={{ animationDelay: `${i * 0.3}s` }}/>
                                ))}
                                {/* Labels */}
                                <text x="100" y="650" textAnchor="middle" 
                                      fontFamily="Orbitron" fontSize="12" fill="#00ffff">رأس البئر</text>
                                <text x="100" y="-30" textAnchor="middle" 
                                      fontFamily="Orbitron" fontSize="12" fill="#00ffff">قاع البئر</text>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// تسجيل المكوّن
window.App = App;