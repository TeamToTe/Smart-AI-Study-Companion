import yt_dlp
import httpx
from typing import List, Dict, Any

def _parse_json3_url(url: str) -> List[Dict[str, Any]]:
    try:
        r = httpx.get(url)
        if r.status_code != 200:
            return None
        data = r.json()
        result = []
        events = data.get('events', [])
        for event in events:
            if 'segs' not in event:
                continue
            text = "".join(s.get('utf8', '') for s in event.get('segs', [])).strip()
            if not text:
                continue
            start = event.get('tStartMs', 0) / 1000
            duration = event.get('dDurationMs', 0) / 1000
            end = start + duration
            result.append({
                'start': start,
                'end': end,
                'text': text
            })
        return result
    except Exception:
        return None

def get_transcript(url: str) -> Dict[str, Any]:
    """
    Return:
        { "source": "youtube", "lang": "en"|"vi", "segments": [...] }
        { "source": None, "segments": [] }
    """
    ydl_opts = {
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en', 'vi'],
        'skip_download': True,
        'quiet': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception:
        return {
            'source': None,
            'segments': []
        }

    for sub_type in ('subtitles', 'automatic_captions'):
        subs = info.get(sub_type, {})
        for lang in ('en', 'vi'):
            if lang not in subs:
                continue
            formats = subs[lang]
            json3 = next((f for f in formats if f.get('ext') == 'json3'), None)
            if not json3:
                continue
            segments = _parse_json3_url(json3['url'])
            if segments:
                return {
                    'source': 'youtube',
                    'lang': lang,
                    'segments': segments
                }
    return {
        'source': None,
        'segments': []
    }

if __name__ == '__main__':
    url = input('Enter url: ')
    result = get_transcript(url)
    for segment in result.get('segments', []):
        print(segment)
