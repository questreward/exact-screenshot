import json, os, collections
circ=json.load(open('circo.json'))['features']
polys=[]
for f in circ:
    g=f['geometry']; rings=[]
    ps=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    for p in ps: rings.append(p)
    xs=[c[0] for p in ps for c in p[0]]; ys=[c[1] for p in ps for c in p[0]]
    polys.append((f['properties']['codeCirconscription'],ps,(min(xs),min(ys),max(xs),max(ys)),f['properties']['codeDepartement']))
def inring(x,y,r):
    n=len(r);ins=False;j=n-1
    for i in range(n):
        xi,yi=r[i];xj,yj=r[j]
        if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi: ins=not ins
        j=i
    return ins
def inpoly(x,y,ps):
    for p in ps:
        if inring(x,y,p[0]) and not any(inring(x,y,h) for h in p[1:]): return True
    return False
bydep=collections.defaultdict(list)
for code,ps,bb,dep in polys: bydep[dep].append((code,ps,bb))
com=json.load(open('communes.json'))
out=collections.defaultdict(list); idx=[]; miss=0; circ_comm=collections.Counter()
for c in com:
    if not c.get('centre'): continue
    x,y=c['centre']['coordinates']; d=c['codeDepartement']; cc=None
    for code,ps,bb in bydep.get(d,[]):
        if bb[0]<=x<=bb[2] and bb[1]<=y<=bb[3] and inpoly(x,y,ps): cc=code;break
    if cc is None and len(bydep.get(d,[]))==1: cc=bydep[d][0][0]
    if cc is None and bydep.get(d):
        # plus proche par centre de boîte
        cc=min(bydep[d],key=lambda t:((t[2][0]+t[2][2])/2-x)**2+((t[2][1]+t[2][3])/2-y)**2)[0]; miss+=1
    cp=(c.get('codesPostaux') or [''])[0]
    out[d].append([c['code'],c['nom'],cp,c.get('population') or 0,round(x,4),round(y,4),cc or ''])
    idx.append([c['code'],c['nom'],cp,d])
    if cc: circ_comm[cc]+=1
os.makedirs('out/communes',exist_ok=True)
for d,rows in out.items(): json.dump(rows,open(f'out/communes/{d}.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(idx,open('out/communes-index.json','w'),ensure_ascii=False,separators=(',',':'))
print('communes',len(idx),'deps',len(out),'approx',miss,'circos with communes',len(circ_comm))
