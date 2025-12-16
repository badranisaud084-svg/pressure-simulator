// محرك الحسابات الفيزيائية - مطابق لـ Python
class PressureEngine {
    constructor() {
        this.STB_TO_FT3 = 5.615;
        this.SECONDS_PER_DAY = 86400;
        this.FRICTION_CONSTANT = 2.5e-6;
        this.WATER_GRADIENT = 0.433;
        this.PI = 5.0;
        this.DEPTH = 8000;
        this.N_POINTS = 150;
    }

    apiToSpecificGravity(api) {
        return 141.5 / (131.5 + api);
    }

    calculateDynamicGradient(pressure, presRes, waterCut, oilSg) {
        const waterSg = 1.0;
        const mixtureSg = oilSg * (1 - waterCut) + waterSg * waterCut;
        const pressureRatio = Math.max(0.01, Math.min(1.0, pressure / presRes));
        const gasExpansionFactor = 1.0 / (0.2 + 0.8 * Math.pow(pressureRatio, 0.6));
        const finalSg = mixtureSg * gasExpansionFactor;
        const pressureGradient = finalSg * this.WATER_GRADIENT;
        
        return { gradient: pressureGradient, sg: finalSg };
    }

    calculateTraverse(pres, waterCut, api, tid, rate, gasRate = 0) {
        const oilSg = this.apiToSpecificGravity(api);
        const depthArray = Array.from({length: this.N_POINTS}, (_, i) => 
            this.DEPTH - (i * this.DEPTH / (this.N_POINTS - 1))
        );
        const pressureArray = new Array(this.N_POINTS);
        
        const pwf = pres - rate / this.PI;
        pressureArray[0] = pwf;
        
        const frictionGrad = (tid > 0) ? 
            this.FRICTION_CONSTANT * Math.pow(rate, 1.8) / Math.pow(tid, 4.8) : 0;
        
        for (let i = 1; i < this.N_POINTS; i++) {
            const segmentLength = depthArray[i-1] - depthArray[i];
            const { gradient: hydroGrad, sg: fluidSg } = this.calculateDynamicGradient(
                pressureArray[i-1], pres, waterCut / 100, oilSg
            );
            
            let finalHydroGrad = hydroGrad;
            if (gasRate > 0) {
                const gasFraction = Math.min(0.4, gasRate / 2000);
                finalHydroGrad *= (1 - gasFraction * 0.6);
            }
            
            const totalGrad = finalHydroGrad + frictionGrad;
            pressureArray[i] = pressureArray[i-1] - totalGrad * segmentLength;
        }
        
        const whp = pressureArray[this.N_POINTS - 1];
        const status = this.getStatus(whp, rate);
        const { sg: finalFluidSg } = this.calculateDynamicGradient(whp, pres, waterCut / 100, oilSg);
        
        return {
            depth: depthArray,
            pressure: pressureArray,
            pwf: pwf,
            whp: whp,
            velocity: this.calculateVelocity(rate, tid),
            status: status,
            fluidSg: finalFluidSg
        };
    }

    calculateVelocity(rate, tid) {
        const q_ft3s = (rate * this.STB_TO_FT3) / this.SECONDS_PER_DAY;
        const area_ft2 = Math.PI * Math.pow((tid / 24), 2);
        return (area_ft2 > 0) ? q_ft3s / area_ft2 : 0;
    }

    getStatus(whp, rate) {
        if (whp <= 0) return { text: '❌ بحاجة لرفع صناعي', class: 'status-danger' };
        if (rate < 200) return { text: '⚡ إنتاج منخفض', class: 'status-warning' };
        return { text: '✅ تشغيل مثالي', class: 'status-optimal' };
    }
}

// تصدير للاستخدام في App.js
window.PressureEngine = PressureEngine;