// حاسبة IPR المتقدمة
class IPRCalculator {
    static vogel(pRes, pBubble, pwf, pi, re = 1000, rw = 0.5, skin = 0) {
        let qoMax, qo;
        
        if (pRes <= pBubble) {
            // مكمن مشبع
            qoMax = (pi * pRes) / 1.8;
            const pratio = pwf / pRes;
            qo = qoMax * (1 - 0.2 * pratio - 0.8 * pratio * pratio);
        } else {
            // مكمن غير مشبع
            const qoBubble = pi * (pRes - pBubble);
            qoMax = qoBubble + (pi * pBubble) / 1.8;
            
            if (pwf >= pBubble) {
                qo = pi * (pRes - pwf);
            } else {
                qo = qoBubble + (pi * pBubble / 1.8) * 
                     (1 - 0.2 * (pwf / pBubble) - 0.8 * Math.pow(pwf / pBubble, 2));
            }
        }
        
        // معامل كفاءة التدفق
        const flowEfficiency = (re / rw - 1) / (re / rw - 1 + skin);
        return qo * flowEfficiency;
    }

    static fetkovich(pRes, pwf, k = 50, h = 50, re = 1000, rw = 0.5, skin = 0, n = 0.854) {
        const fe = (re / rw - 1) / (re / rw - 1 + skin);
        const c = 0.00708 * k * h / (Math.log(re / rw) - 0.5 + skin);
        const qo = c * Math.pow(Math.pow(pRes, 2) - Math.pow(pwf, 2), n);
        return qo * fe;
    }

    static generateIPRCurve(pRes, pBubble, pi, points = 50) {
        const pwfRange = Array.from({length: points}, (_, i) => (pRes * i) / (points - 1));
        const vogelData = pwfRange.map(pwf => ({
            pwf: pwf,
            rate: this.vogel(pRes, pBubble, pwf, pi)
        }));
        const fetkovichData = pwfRange.map(pwf => ({
            pwf: pwf,
            rate: this.fetkovich(pRes, pwf)
        }));
        
        return { vogel: vogelData, fetkovich: fetkovichData };
    }
}

window.IPRCalculator = IPRCalculator;