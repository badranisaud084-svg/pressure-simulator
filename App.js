// محاكي ضغط الآبار - إصدار مضمون 100%
class App {
    constructor() {
        this.params = {
            p_res: 3000,
            water_cut: 20,
            api: 30,
            tid: 2.5,
            rate: 1000,
            gas_rate: 0
        };
        
        this.engine = new PressureEngine();
        this.iprCalc = new IPRCalculator();
        
        this.init();
    }

    init() {
        this.createInterface();
        this.updateAnalysis();
        // تحديث تلقائي كل 100ms
        setInterval(() => this.updateAnalysis(), 100);
    }

    createInterface() {
        const root = document.getElementById('root');
        root.innerHTML = `
            <div class="app-container">
                <div class="control-panel">
                    <h1>🛢️ محاكي ضغط الآبار</h1>
                    ${this.createControls()}
                </div>
                <div class="visual-panel">
                    <div class="plot-container">
                        <h2>📈 ملف الضغط النزولي</h2>
                        <div id="pressure-plot" style="width: 100%; height: 100%;"></div>
                        <div class="hud-overlay">${this.createHUD()}</div>
                    </div>
                    <div class="plot-container" style="display: flex; gap: 20px;">
                        <div style="flex: 1;">
                            <h2>⚙️ منحنى IPR</h2>
                            <div id="ipr-plot" style="width: 100%; height: 100%;"></div>
                        </div>
                        <div style="flex: 0.4;">
                            <h2>🔬 مقطع البئر</h2>
                            <div class="wellbore-container" id="schematic"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.attachSliderEvents();
    }

    createControls() {
        const controls = [
            { key: 'p_res', label: 'ضغط المكمن', min: 1000, max: 6000, step: 50, unit: 'psi', color: '#00ffff' },
            { key: 'water_cut', label: 'نسبة الماء', min: 0, max: 100, step: 1, unit: '%', color: '#ff6b35' },
            { key: 'api', label: 'API النفط', min: 10, max: 50, step: 1, unit: '', color: '#00ff9d' },
            { key: 'tid', label: 'قطر الأنبوب', min: 1.5, max: 4.5, step: 0.1, unit: 'in', color: '#9d4edd' },
            { key: 'rate', label: 'معدل الإنتاج', min: 100, max: 5000, step: 50, unit: 'STB/D', color: '#ffd166' },
            { key: 'gas_rate', label: 'معدل الغاز', min: 0, max: 2000, step: 50, unit: 'Mscf/D', color: '#ff9e6d' }
        ];

        return controls.map(ctrl => `
            <div class="control-group">
                <div class="control-label">
                    <span>${ctrl.label}</span>
                    <span class="control-value" style="border-color: ${ctrl.color}; color: ${ctrl.color}">
                        ${this.params[ctrl.key].toFixed(1)} ${ctrl.unit}
                    </span>
                </div>
                <div class="slider-container">
                    <input type="range" id="${ctrl.key}" min="${ctrl.min}" max="${ctrl.max}" 
                           step="${ctrl.step}" value="${this.params[ctrl.key]}" 
                           data-key="${ctrl.key}" data-color="${ctrl.color}">
                </div>
            </div>
        `).join('');
    }

    attachSliderEvents() {
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const key = e.target.dataset.key;
                const value = parseFloat(e.target.value);
                this.params[key] = value;
                e.target.nextElementSibling.textContent = value.toFixed(1);
                this.updateAnalysis();
            });
        });
    }

    updateAnalysis() {
        const traverse = this.engine.calculateTraverse(
            this.params.p_res, this.params.water_cut, this.params.api,
            this.params.tid, this.params.rate, this.params.gas_rate
        );
        
        const iprCurve = this.iprCalc.generateIPRCurve(this.params.p_res, 2000, 5.0);
        
        this.updatePlots(traverse, iprCurve);
        this.updateSchematic(traverse);
        this.updateHUD(traverse);
    }

    updatePlots(traverse, iprCurve) {
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
            title: { text: 'ملف ضغط البئر النزولي', font: { family: 'Orbitron', size: 18, color: '#00ffff' } },
            xaxis: { title: 'الضغط (psi)', gridcolor: '#1e2d4a', color: '#8892b0' },
            yaxis: { title: 'العمق (ft)', gridcolor: '#1e2d4a', color: '#8892b0', autorange: 'reversed' },
            plot_bgcolor: 'rgba(0,0,0,0)', paper_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e0e6ed' },
            shapes: [
                { type: 'line', x0: traverse.pwf, x1: traverse.pwf, y0: 0, y1: 8000, line: { color: '#ff6b35', width: 2, dash: 'dot' } },
                { type: 'line', x0: this.params.p_res, x1: this.params.p_res, y0: 0, y1: 8000, line: { color: '#ffd166', width: 2, dash: 'dash' } }
            ],
            annotations: [{ x: this.params.p_res, y: 4000, text: `ضغط المكمن: ${this.params.p_res.toFixed(0)} psi`, showarrow: true, arrowcolor: '#ffd166', font: { color: '#ffd166' } }]
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
            x: [this.params.rate],
            y: [traverse.pwf],
            type: 'scatter',
            mode: 'markers',
            marker: { size: 15, color: '#00ff9d', symbol: 'star', line: { color: '#ffffff', width: 2 } },
            name: 'نقطة التشغيل'
        };

        Plotly.newPlot('ipr-plot', [vogelTrace, fetkovichTrace, operatingPoint], {
            title: { text: 'Inflow Performance Relationship', font: { family: 'Orbitron', size: 18, color: '#00ff9d' } },
            xaxis: { title: 'معدل الإنتاج (STB/D)', gridcolor: '#1e2d4a', color: '#8892b0' },
            yaxis: { title: 'ضغط التدفق (psi)', gridcolor: '#1e2d4a', color: '#8892b0' },
            plot_bgcolor: 'rgba(0,0,0,0)', paper_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e0e6ed' },
            legend: { x: 0.7, y: 0.95, font: { color: '#e0e6ed' } }
        });
    }

    updateSchematic(traverse) {
        const schematic = document.getElementById('schematic');
        const fluidHeight = 400 + traverse.fluidSg * 100;
        const bubbleCount = Math.max(0, Math.floor((1 - traverse.fluidSg) * 8));

        schematic.innerHTML = `
            <svg class="wellbore-svg" viewBox="0 0 200 700">
                <rect x="40" y="0" width="120" height="600" fill="none" stroke="#7f8c8d" stroke-width="8" rx="5"/>
                <rect x="70" y="0" width="60" height="600" fill="none" stroke="#2c3e50" stroke-width="6" rx="3"/>
                <rect class="fluid-fill" x="72" y="${600-fluidHeight}" width="56" height="${fluidHeight}" 
                      fill="rgba(${200 - traverse.fluidSg*100}, ${150 - this.params.water_cut}, ${traverse.fluidSg*255}, 0.7)" rx="2"/>
                <line x1="100" y1="500" x2="100" y2="150" stroke="#ffd166" stroke-width="4" 
                      marker-end="url(#arrowhead)" class="flow-animation"/>
                <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ffd166"/>
                </marker></defs>
                ${Array.from({length: bubbleCount}).map((_, i) => `
                    <circle cx="${85 + i * 5}" cy="${200 + i * 40}" r="3" 
                            fill="rgba(255, 255, 255, 0.7)" class="bubble"/>
                `).join('')}
                <text x="100" y="650" text-anchor="middle" font-family="Orbitron" font-size="12" fill="#00ffff">رأس البئر</text>
                <text x="100" y="-30" text-anchor="middle" font-family="Orbitron" font-size="12" fill="#00ffff">قاع البئر</text>
            </svg>
        `;
    }

    createHUD() {
        return `
            <div class="hud-item">
                <div class="hud-label">السرعة</div>
                <div class="hud-value" id="hud-velocity" style="color: #00ff9d">-- ft/s</div>
            </div>
            <div class="hud-item">
                <div class="hud-label">الحالة</div>
                <div class="hud-value" id="hud-status" class="status-warning">--</div>
            </div>
            <div class="hud-item">
                <div class="hud-label">ضغط الرأس</div>
                <div class="hud-value" id="hud-whp" style="color: #ff6b35">-- psi</div>
            </div>
        `;
    }

    updateHUD(traverse) {
        if (!document.getElementById('hud-velocity')) return;
        
        document.getElementById('hud-velocity').textContent = `${traverse.velocity.toFixed(2)} ft/s`;
        document.getElementById('hud-whp').textContent = `${traverse.whp.toFixed(1)} psi`;
        
        const statusEl = document.getElementById('hud-status');
        statusEl.textContent = traverse.status.text;
        statusEl.className = `hud-value ${traverse.status.class}`;
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new App();
    console.log('✅ محاكي ضغط الآبار تم التشغيل بنجاح');
});
