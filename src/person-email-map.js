export const PERSON_EMAIL_MAP = {
  'administracja maturalni.com': 'administracja@maturalni.com',
  'izabela peret': 'i.peret@maturalni.com',
  'monika saj': 'm.saj@maturalni.com',
  'nataniel broznowicz': 'n.broznowicz@maturalni.com',
  'nataniel brożnowicz': 'n.broznowicz@maturalni.com',
  'sebastian peret': 's.peret@maturalni.com',
  'wiktoria noga': 'w.noga@maturalni.com',
  'adam galant': 'a.galant@maturalni.com',
  'cezary wronka': 'c.wronka@maturalni.com',
  'daria najberg': 'd.najberg@maturalni.com',
  'jakub indyk': 'j.indyk@maturalni.com',
  'jakub lula': 'j.lula@maturalni.com',
  'kacper kipa': 'k.kipa@maturalni.com',
  'kacper woch': 'k.woch@maturalni.com',
  'kamila brodzinska': 'k.brodzinska@maturalni.com',
  'kamila brodzińska': 'k.brodzinska@maturalni.com',
  'kamila zaremba': 'k.zaremba@maturalni.com',
  'karolina bielecka': 'k.bielecka@maturalni.com',
  'katarzyna dammicco': 'k.dammicco@maturalni.com',
  'kinga kryn': 'k.kryn@maturalni.com',
  'kinga kryń': 'k.kryn@maturalni.com',
  'kinga mikula': 'k.mikula@maturalni.com',
  'kinga mikuła': 'k.mikula@maturalni.com',
  'krzysztof pierzchala': 'k.pierzchala@maturalni.com',
  'krzysztof pierzchała': 'k.pierzchala@maturalni.com',
  'lukasz ochman': 'l.ochman@maturalni.com',
  'łukasz ochman': 'l.ochman@maturalni.com',
  'maciej burda': 'm.burda@maturalni.com',
  'marcel wojcik': 'm.wojcik@maturalni.com',
  'marcel wójcik': 'm.wojcik@maturalni.com',
  'mateusz noga': 'm.noga@maturalni.com',
  'michal gancarczyk': 'm.gancarczyk@maturalni.com',
  'michał gancarczyk': 'm.gancarczyk@maturalni.com',
  'michal musz': 'm.musz@maturalni.com',
  'michał musz': 'm.musz@maturalni.com',
  'patrycja zawada': 'p.zawada@maturalni.com',
  'piotr petrycki': 'p.petrycki@maturalni.com',
  'rafal szumelda': 'r.szumelda@maturalni.com',
  'rafał szumełda': 'r.szumelda@maturalni.com',
  'rafa szumeda': 'r.szumelda@maturalni.com',
  'rafał szumeda': 'r.szumelda@maturalni.com',
  'rozliczenia maturalni.com': 'rozliczenia@maturalni.com',
  'sara kosiarska': 's.kosiarska@maturalni.com',
  'sebastian pietraszewski': 's.pietraszewski@maturalni.com',
  'szymon zakrzyk': 's.zakrzyk@maturalni.com',
  'wiktoria nowak': 'w.nowak@maturalni.com',
  'wiktoria reczko': 'w.reczko@maturalni.com',
  'zuzanna weglarz': 'z.weglarz@maturalni.com',
  'zuzanna węglarz': 'z.weglarz@maturalni.com',
  'anna hoffman': 'a.hoffmann@maturalni.com',
  'anna hoffmann': 'a.hoffmann@maturalni.com',
  'magorzata dworzyska': 'm.dworzynska@maturalni.com',
  'magorzata dworzynska': 'm.dworzynska@maturalni.com',
  'małgorzata dworzynska': 'm.dworzynska@maturalni.com',
  'malgorzata dworzynska': 'm.dworzynska@maturalni.com',
  'kinga mikua': 'k.mikula@maturalni.com'
};

export function normalizePersonName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function resolvePersonEmail(name) {
  const key = normalizePersonName(name);
  return PERSON_EMAIL_MAP[key] || null;
}