const fs = require('fs');
const stripBom = (s) => s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
const withBom = (s, old) => old.charCodeAt(0) === 0xFEFF ? '\xef\xbb\xbf' + s : s;

const updateLocales = () => {
  const updates = {
    en: {
      errorProcess: 'Could not process your input.',
      generatedInsights: 'Generated {{count}} insight',
      generatedInsights_plural: 'Generated {{count}} insights',
      requestCompleted: 'Request completed.',
      recognitionFailed: 'Speech recognition failed. Please try again.',
      micError: 'Unable to start microphone.'
    },
    hi: {
      errorProcess: 'आपकी बात समझ नहीं पाए।',
      generatedInsights: '{{count}} इनसाइट तैयार की गई',
      generatedInsights_plural: '{{count}} इनसाइट्स तैयार की गईं',
      requestCompleted: 'प्रक्रिया पूरी हुई।',
      recognitionFailed: 'आवाज़ पहचान नहीं पाए। कृपया फिर से कोशिश करें।',
      micError: 'माइक चालू नहीं हो सका।'
    },
    te: {
      errorProcess: 'మీ ఇన్‌పుట్‌ను ప్రాసెస్ చేయలేకపోయాము.',
      generatedInsights: '{{count}} ఇన్‌సైట్ రూపొందించబడింది',
      generatedInsights_plural: '{{count}} ఇన్‌సైట్స్ రూపొందించబడ్డాయి',
      requestCompleted: 'అభ్యర్థన పూర్తయింది.',
      recognitionFailed: 'వాయిస్ గుర్తింపు విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
      micError: 'మైక్రోఫోన్ ప్రారంభించలేకపోయాము.'
    },
    ta: {
      errorProcess: 'உங்கள் பேச்சை செயல்படுத்த முடியவில்லை.',
      generatedInsights: '{{count}} இன்சைட் உருவாக்கப்பட்டது',
      generatedInsights_plural: '{{count}} இன்சைட்கள் உருவாக்கப்பட்டன',
      requestCompleted: 'செயல்முறை முடிந்தது.',
      recognitionFailed: 'குரல் அறிதல் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
      micError: 'மைக்ரோஃபோனைத் தொடங்க முடியவில்லை.'
    }
  };

  for (const [lang, news] of Object.entries(updates)) {
    const path = 'locales/' + lang + '/common.json';
    const raw = fs.readFileSync(path, 'utf8');
    const content = stripBom(raw);
    const data = JSON.parse(content);
    data.mic = { ...data.mic, ...news };
    const str = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(path, withBom(str, raw));
  }
};
updateLocales();
