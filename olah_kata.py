import json, re, collections

SUMBER = 'data/mentah/data_teks_kemiskinan.json'
TUJUAN = 'data/olahan/data_teks_kemiskinan.json'

data = json.load(open(SUMBER, encoding='utf-8'))

# 1. Blok Word utuh (gaya laten, dokumen XML, definisi gaya tabel)
BLOK = [
    r'\bw latentstyles\b.*?\bw latentstyles\b',
    r'\bw worddocument\b.*?\bw worddocument\b',
    r'\bstyle definitions\b.*?\bstyle endif\b',
    r'\bif gte mso\b', r'\bendif\b',
]
# 2. Kata penanda HTML / CSS / Word yang berdiri sendiri
SAMPAH = set('''
ul li br div span font style size align justify text margin bottom top left right padding
border box sizing height weight family face color rgb background px pt rem em quot nbsp
mso msonormal msonormaltable bidi ansi fareast lang language proof yes no true false
arial verdana wingdings times roman new serif sans calibri cambria math narrow
qformat semihidden unhidewhenused lsdexception locked priority defpriority
latentstyles latentstylecount deflockedstate defunhidewhenused defsemihidden defqformat
accent shading colorful grid dark light toc heading list line normal val xml class
variant indent align tstyle rowband colband noshow pagination widow orphan parent alt
sizing compatibility mathpr mathfont brkbin brksub smallfrac dispdef lmargin rmargin
defjc centergroup wrapindent intlim narylim undovr
ibm plex apple tab white space pre ligatures caps year month date of
'''.split())
# 3. Singkatan dan huruf lepas; dibuang dari awan kata
TERLALU_PENDEK = lambda t: len(t) <= 2 and t not in {'di'}

def bersihkan_teks(t):
    t = re.sub(r'\s+', ' ', t).strip()
    for p in BLOK:
        t = re.sub(p, ' ', t, flags=re.S)
    return t

def token_valid(t):
    return t.isalpha() and t not in SAMPAH and not TERLALU_PENDEK(t)

sebelum = collections.Counter(t for r in data for t in r['tokens'])
hasil = []
for r in data:
    teks = bersihkan_teks(r['teks_bersih'])
    # Hanya saring token jika kata itu memang sampah pada konteks gaya;
    # kata sah seperti "medium", "normal", "premium" dipulihkan di bawah.
    tokens = [t for t in teks.split() if token_valid(t)]
    hasil.append({**r, 'teks_bersih': ' '.join(tokens), 'tokens': tokens})

sesudah = collections.Counter(t for r in hasil for t in r['tokens'])
json.dump(hasil, open(TUJUAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=4)
print('token sebelum:', sum(sebelum.values()), 'sesudah:', sum(sesudah.values()))
print(sesudah.most_common(40))
for k in ['unhidewhenused','semihidden','isdexception','lsdexception','locked','priority','false','ul','li','font','style','span','persen','persentase','medium','normal','premium']:
    print(k, sebelum[k], '->', sesudah[k])