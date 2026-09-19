import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isAbsolute, join, relative, resolve } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createRequire } from "module";
//#region node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/index.mjs
var require = createRequire("/");
var _a;
try {
	_a = require("worker_threads"), _a.Worker, _a.isMarkedAsUntransferable;
} catch (e) {}
var u8 = Uint8Array, u16 = Uint16Array, i32 = Int32Array;
var fleb = new u8([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	1,
	1,
	1,
	2,
	2,
	2,
	2,
	3,
	3,
	3,
	3,
	4,
	4,
	4,
	4,
	5,
	5,
	5,
	5,
	0,
	0,
	0,
	0
]);
var fdeb = new u8([
	0,
	0,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	3,
	4,
	4,
	5,
	5,
	6,
	6,
	7,
	7,
	8,
	8,
	9,
	9,
	10,
	10,
	11,
	11,
	12,
	12,
	13,
	13,
	0,
	0
]);
var clim = new u8([
	16,
	17,
	18,
	0,
	8,
	7,
	9,
	6,
	10,
	5,
	11,
	4,
	12,
	3,
	13,
	2,
	14,
	1,
	15
]);
var freb = function(eb, start) {
	var b = new u16(31);
	for (var i = 0; i < 31; ++i) b[i] = start += 1 << eb[i - 1];
	var r = new i32(b[30]);
	for (var i = 1; i < 30; ++i) for (var j = b[i]; j < b[i + 1]; ++j) r[j] = j - b[i] << 5 | i;
	return {
		b,
		r
	};
};
var _a = freb(fleb, 2), fl = _a.b, revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0), fd = _b.b, revfd = _b.r;
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
	var x = (i & 43690) >> 1 | (i & 21845) << 1;
	x = (x & 52428) >> 2 | (x & 13107) << 2;
	x = (x & 61680) >> 4 | (x & 3855) << 4;
	rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var hMap = (function(cd, mb, r) {
	var s = cd.length;
	var i = 0;
	var l = new u16(mb);
	for (; i < s; ++i) if (cd[i]) ++l[cd[i] - 1];
	var le = new u16(mb);
	for (i = 1; i < mb; ++i) le[i] = le[i - 1] + l[i - 1] << 1;
	var co;
	if (r) {
		co = new u16(1 << mb);
		var rvb = 15 - mb;
		for (i = 0; i < s; ++i) if (cd[i]) {
			var sv = i << 4 | cd[i];
			var r_1 = mb - cd[i];
			var v = le[cd[i] - 1]++ << r_1;
			for (var m = v | (1 << r_1) - 1; v <= m; ++v) co[rev[v] >> rvb] = sv;
		}
	} else {
		co = new u16(s);
		for (i = 0; i < s; ++i) if (cd[i]) co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
	}
	return co;
});
var flt = new u8(288);
for (var i = 0; i < 144; ++i) flt[i] = 8;
for (var i = 144; i < 256; ++i) flt[i] = 9;
for (var i = 256; i < 280; ++i) flt[i] = 7;
for (var i = 280; i < 288; ++i) flt[i] = 8;
var fdt = new u8(32);
for (var i = 0; i < 32; ++i) fdt[i] = 5;
var flm = /*#__PURE__*/ hMap(flt, 9, 0), flrm = /*#__PURE__*/ hMap(flt, 9, 1);
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0), fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
var max = function(a) {
	var m = a[0];
	for (var i = 1; i < a.length; ++i) if (a[i] > m) m = a[i];
	return m;
};
var bits = function(d, p, m) {
	var o = p / 8 | 0;
	return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
	var o = p / 8 | 0;
	return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
	return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
	if (s == null || s < 0) s = 0;
	if (e == null || e > v.length) e = v.length;
	return new u8(v.subarray(s, e));
};
var ec = [
	"unexpected EOF",
	"invalid block type",
	"invalid length/literal",
	"invalid distance",
	"stream finished",
	"no stream handler",
	,
	"no callback",
	"invalid UTF-8 data",
	"extra field too long",
	"date not in range 1980-2099",
	"filename too long",
	"stream finishing",
	"invalid zip data"
];
var err = function(ind, msg, nt) {
	var e = new Error(msg || ec[ind]);
	e.code = ind;
	if (Error.captureStackTrace) Error.captureStackTrace(e, err);
	if (!nt) throw e;
	return e;
};
var inflt = function(dat, st, buf, dict) {
	var sl = dat.length, dl = dict ? dict.length : 0;
	if (!sl || st.f && !st.l) return buf || new u8(0);
	var noBuf = !buf;
	var resize = noBuf || st.i != 2;
	var noSt = st.i;
	if (noBuf) buf = new u8(sl * 3);
	var cbuf = function(l) {
		var bl = buf.length;
		if (l > bl) {
			var nbuf = new u8(Math.max(bl * 2, l));
			nbuf.set(buf);
			buf = nbuf;
		}
	};
	var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
	var tbts = sl * 8;
	do {
		if (!lm) {
			final = bits(dat, pos, 1);
			var type = bits(dat, pos + 1, 3);
			pos += 3;
			if (!type) {
				var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
				if (t > sl) {
					if (noSt) err(0);
					break;
				}
				if (resize) cbuf(bt + l);
				buf.set(dat.subarray(s, t), bt);
				st.b = bt += l, st.p = pos = t * 8, st.f = final;
				continue;
			} else if (type == 1) lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
			else if (type == 2) {
				var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
				var tl = hLit + bits(dat, pos + 5, 31) + 1;
				pos += 14;
				var ldt = new u8(tl);
				var clt = new u8(19);
				for (var i = 0; i < hcLen; ++i) clt[clim[i]] = bits(dat, pos + i * 3, 7);
				pos += hcLen * 3;
				var clb = max(clt), clbmsk = (1 << clb) - 1;
				var clm = hMap(clt, clb, 1);
				for (var i = 0; i < tl;) {
					var r = clm[bits(dat, pos, clbmsk)];
					pos += r & 15;
					var s = r >> 4;
					if (s < 16) ldt[i++] = s;
					else {
						var c = 0, n = 0;
						if (s == 16) n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
						else if (s == 17) n = 3 + bits(dat, pos, 7), pos += 3;
						else if (s == 18) n = 11 + bits(dat, pos, 127), pos += 7;
						while (n--) ldt[i++] = c;
					}
				}
				var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
				lbt = max(lt);
				dbt = max(dt);
				lm = hMap(lt, lbt, 1);
				dm = hMap(dt, dbt, 1);
			} else err(1);
			if (pos > tbts) {
				if (noSt) err(0);
				break;
			}
		}
		if (resize) cbuf(bt + 131072);
		var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
		var lpos = pos;
		for (;; lpos = pos) {
			var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
			pos += c & 15;
			if (pos > tbts) {
				if (noSt) err(0);
				break;
			}
			if (!c) err(2);
			if (sym < 256) buf[bt++] = sym;
			else if (sym == 256) {
				lpos = pos, lm = null;
				break;
			} else {
				var add = sym - 254;
				if (sym > 264) {
					var i = sym - 257, b = fleb[i];
					add = bits(dat, pos, (1 << b) - 1) + fl[i];
					pos += b;
				}
				var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
				if (!d) err(3);
				pos += d & 15;
				var dt = fd[dsym];
				if (dsym > 3) {
					var b = fdeb[dsym];
					dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
				}
				if (pos > tbts) {
					if (noSt) err(0);
					break;
				}
				if (resize) cbuf(bt + 131072);
				var end = bt + add;
				if (bt < dt) {
					var shift = dl - dt, dend = Math.min(dt, end);
					if (shift + bt < 0) err(3);
					for (; bt < dend; ++bt) buf[bt] = dict[shift + bt];
				}
				for (; bt < end; ++bt) buf[bt] = buf[bt - dt];
			}
		}
		st.l = lm, st.p = lpos, st.b = bt, st.f = final;
		if (lm) final = 1, st.m = lbt, st.d = dm, st.n = dbt;
	} while (!final);
	return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
	v <<= p & 7;
	var o = p / 8 | 0;
	d[o] |= v;
	d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
	v <<= p & 7;
	var o = p / 8 | 0;
	d[o] |= v;
	d[o + 1] |= v >> 8;
	d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
	var t = [];
	for (var i = 0; i < d.length; ++i) if (d[i]) t.push({
		s: i,
		f: d[i]
	});
	var s = t.length;
	var t2 = t.slice();
	if (!s) return {
		t: et,
		l: 0
	};
	if (s == 1) {
		var v = new u8(t[0].s + 1);
		v[t[0].s] = 1;
		return {
			t: v,
			l: 1
		};
	}
	t.sort(function(a, b) {
		return a.f - b.f;
	});
	t.push({
		s: -1,
		f: 25001
	});
	var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
	t[0] = {
		s: -1,
		f: l.f + r.f,
		l,
		r
	};
	while (i1 != s - 1) {
		l = t[t[i0].f < t[i2].f ? i0++ : i2++];
		r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
		t[i1++] = {
			s: -1,
			f: l.f + r.f,
			l,
			r
		};
	}
	var maxSym = t2[0].s;
	for (var i = 1; i < s; ++i) if (t2[i].s > maxSym) maxSym = t2[i].s;
	var tr = new u16(maxSym + 1);
	var mbt = ln(t[i1 - 1], tr, 0);
	if (mbt > mb) {
		var i = 0, dt = 0;
		var lft = mbt - mb, cst = 1 << lft;
		t2.sort(function(a, b) {
			return tr[b.s] - tr[a.s] || a.f - b.f;
		});
		for (; i < s; ++i) {
			var i2_1 = t2[i].s;
			if (tr[i2_1] > mb) {
				dt += cst - (1 << mbt - tr[i2_1]);
				tr[i2_1] = mb;
			} else break;
		}
		dt >>= lft;
		while (dt > 0) {
			var i2_2 = t2[i].s;
			if (tr[i2_2] < mb) dt -= 1 << mb - tr[i2_2]++ - 1;
			else ++i;
		}
		for (; i >= 0 && dt; --i) {
			var i2_3 = t2[i].s;
			if (tr[i2_3] == mb) {
				--tr[i2_3];
				++dt;
			}
		}
		mbt = mb;
	}
	return {
		t: new u8(tr),
		l: mbt
	};
};
var ln = function(n, l, d) {
	return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
	var s = c.length;
	while (s && !c[--s]);
	var cl = new u16(++s);
	var cli = 0, cln = c[0], cls = 1;
	var w = function(v) {
		cl[cli++] = v;
	};
	for (var i = 1; i <= s; ++i) if (c[i] == cln && i != s) ++cls;
	else {
		if (!cln && cls > 2) {
			for (; cls > 138; cls -= 138) w(32754);
			if (cls > 2) {
				w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
				cls = 0;
			}
		} else if (cls > 3) {
			w(cln), --cls;
			for (; cls > 6; cls -= 6) w(8304);
			if (cls > 2) w(cls - 3 << 5 | 8208), cls = 0;
		}
		while (cls--) w(cln);
		cls = 1;
		cln = c[i];
	}
	return {
		c: cl.subarray(0, cli),
		n: s
	};
};
var clen = function(cf, cl) {
	var l = 0;
	for (var i = 0; i < cl.length; ++i) l += cf[i] * cl[i];
	return l;
};
var wfblk = function(out, pos, dat) {
	var s = dat.length;
	var o = shft(pos + 2);
	out[o] = s & 255;
	out[o + 1] = s >> 8;
	out[o + 2] = out[o] ^ 255;
	out[o + 3] = out[o + 1] ^ 255;
	for (var i = 0; i < s; ++i) out[o + i + 4] = dat[i];
	return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
	wbits(out, p++, final);
	++lf[256];
	var _a = hTree(lf, 15), dlt = _a.t, mlb = _a.l;
	var _b = hTree(df, 15), ddt = _b.t, mdb = _b.l;
	var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
	var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
	var lcfreq = new u16(19);
	for (var i = 0; i < lclt.length; ++i) ++lcfreq[lclt[i] & 31];
	for (var i = 0; i < lcdt.length; ++i) ++lcfreq[lcdt[i] & 31];
	var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
	var nlcc = 19;
	for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc);
	var flen = bl + 5 << 3;
	var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
	var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
	if (bs >= 0 && flen <= ftlen && flen <= dtlen) return wfblk(out, p, dat.subarray(bs, bs + bl));
	var lm, ll, dm, dl;
	wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
	if (dtlen < ftlen) {
		lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
		var llm = hMap(lct, mlcb, 0);
		wbits(out, p, nlc - 257);
		wbits(out, p + 5, ndc - 1);
		wbits(out, p + 10, nlcc - 4);
		p += 14;
		for (var i = 0; i < nlcc; ++i) wbits(out, p + 3 * i, lct[clim[i]]);
		p += 3 * nlcc;
		var lcts = [lclt, lcdt];
		for (var it = 0; it < 2; ++it) {
			var clct = lcts[it];
			for (var i = 0; i < clct.length; ++i) {
				var len = clct[i] & 31;
				wbits(out, p, llm[len]), p += lct[len];
				if (len > 15) wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
			}
		}
	} else lm = flm, ll = flt, dm = fdm, dl = fdt;
	for (var i = 0; i < li; ++i) {
		var sym = syms[i];
		if (sym > 255) {
			var len = sym >> 18 & 31;
			wbits16(out, p, lm[len + 257]), p += ll[len + 257];
			if (len > 7) wbits(out, p, sym >> 23 & 31), p += fleb[len];
			var dst = sym & 31;
			wbits16(out, p, dm[dst]), p += dl[dst];
			if (dst > 3) wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
		} else wbits16(out, p, lm[sym]), p += ll[sym];
	}
	wbits16(out, p, lm[256]);
	return p + ll[256];
};
var deo = /*#__PURE__*/ new i32([
	65540,
	131080,
	131088,
	131104,
	262176,
	1048704,
	1048832,
	2114560,
	2117632
]);
var et = /*#__PURE__*/ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
	var s = st.z || dat.length;
	var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
	var w = o.subarray(pre, o.length - post);
	var lst = st.l;
	var pos = (st.r || 0) & 7;
	if (lvl) {
		if (pos) w[0] = st.r >> 3;
		var opt = deo[lvl - 1];
		var n = opt >> 13, c = opt & 8191;
		var msk_1 = (1 << plvl) - 1;
		var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
		var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
		var hsh = function(i) {
			return (dat[i] ^ dat[i + 1] << bs1_1 ^ dat[i + 2] << bs2_1) & msk_1;
		};
		var syms = new i32(25e3);
		var lf = new u16(288), df = new u16(32);
		var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
		for (; i + 2 < s; ++i) {
			var hv = hsh(i);
			var imod = i & 32767, pimod = head[hv];
			prev[imod] = pimod;
			head[hv] = imod;
			if (wi <= i) {
				var rem = s - i;
				if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
					pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
					li = lc_1 = eb = 0, bs = i;
					for (var j = 0; j < 286; ++j) lf[j] = 0;
					for (var j = 0; j < 30; ++j) df[j] = 0;
				}
				var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
				if (rem > 2 && hv == hsh(i - dif)) {
					var maxn = Math.min(n, rem) - 1;
					var maxd = Math.min(32767, i);
					var ml = Math.min(258, rem);
					while (dif <= maxd && --ch_1 && imod != pimod) {
						if (dat[i + l] == dat[i + l - dif]) {
							var nl = 0;
							for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl);
							if (nl > l) {
								l = nl, d = dif;
								if (nl > maxn) break;
								var mmd = Math.min(dif, nl - 2);
								var md = 0;
								for (var j = 0; j < mmd; ++j) {
									var ti = i - dif + j & 32767;
									var cd = ti - prev[ti] & 32767;
									if (cd > md) md = cd, pimod = ti;
								}
							}
						}
						imod = pimod, pimod = prev[imod];
						dif += imod - pimod & 32767;
					}
				}
				if (d) {
					syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
					var lin = revfl[l] & 31, din = revfd[d] & 31;
					eb += fleb[lin] + fdeb[din];
					++lf[257 + lin];
					++df[din];
					wi = i + l;
					++lc_1;
				} else {
					syms[li++] = dat[i];
					++lf[dat[i]];
				}
			}
		}
		for (i = Math.max(i, wi); i < s; ++i) {
			syms[li++] = dat[i];
			++lf[dat[i]];
		}
		pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
		if (!lst) {
			st.r = pos & 7 | w[pos / 8 | 0] << 3;
			pos -= 7;
			st.h = head, st.p = prev, st.i = i, st.w = wi;
		}
	} else {
		for (var i = st.w || 0; i < s + lst; i += 65535) {
			var e = i + 65535;
			if (e >= s) {
				w[pos / 8 | 0] = lst;
				e = s;
			}
			pos = wfblk(w, pos + 1, dat.subarray(i, e));
		}
		st.i = s;
	}
	return slc(o, 0, pre + shft(pos) + post);
};
var crct = /*#__PURE__*/ (function() {
	var t = new Int32Array(256);
	for (var i = 0; i < 256; ++i) {
		var c = i, k = 9;
		while (--k) c = (c & 1 && -306674912) ^ c >>> 1;
		t[i] = c;
	}
	return t;
})();
var crc = function() {
	var c = -1;
	return {
		p: function(d) {
			var cr = c;
			for (var i = 0; i < d.length; ++i) cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
			c = cr;
		},
		d: function() {
			return ~c;
		}
	};
};
var dopt = function(dat, opt, pre, post, st) {
	if (!st) {
		st = { l: 1 };
		if (opt.dictionary) {
			var dict = opt.dictionary.subarray(-32768);
			var newDat = new u8(dict.length + dat.length);
			newDat.set(dict);
			newDat.set(dat, dict.length);
			dat = newDat;
			st.w = dict.length;
		}
	}
	return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
	var o = {};
	for (var k in a) o[k] = a[k];
	for (var k in b) o[k] = b[k];
	return o;
};
var b2 = function(d, b) {
	return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
	return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
	return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
	for (; v; ++b) d[b] = v, v >>>= 8;
};
/**
* Compresses data with DEFLATE without any wrapper
* @param data The data to compress
* @param opts The compression options
* @returns The deflated version of the data
*/
function deflateSync(data, opts) {
	return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
	return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t, o) {
	for (var k in d) {
		var val = d[k], n = p + k, op = o;
		if (Array.isArray(val)) op = mrg(o, val[1]), val = val[0];
		if (ArrayBuffer.isView(val)) t[n] = [val, op];
		else {
			t[n += "/"] = [new u8(0), op];
			fltn(val, n, t, o);
		}
	}
};
var te = typeof TextEncoder != "undefined" && /*#__PURE__*/ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /*#__PURE__*/ new TextDecoder();
try {
	td.decode(et, { stream: true });
} catch (e) {}
var dutf8 = function(d) {
	for (var r = "", i = 0;;) {
		var c = d[i++];
		var eb = (c > 127) + (c > 223) + (c > 239);
		if (i + eb > d.length) return {
			s: r,
			r: slc(d, i - 1)
		};
		if (!eb) r += String.fromCharCode(c);
		else if (eb == 3) c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
		else if (eb & 1) r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
		else r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
	}
};
/**
* Converts a string into a Uint8Array for use with compression/decompression methods
* @param str The string to encode
* @param latin1 Whether or not to interpret the data as Latin-1. This should
*               not need to be true unless decoding a binary string.
* @returns The string encoded in UTF-8/Latin-1 binary
*/
function strToU8(str, latin1) {
	if (latin1) {
		var ar_1 = new u8(str.length);
		for (var i = 0; i < str.length; ++i) ar_1[i] = str.charCodeAt(i);
		return ar_1;
	}
	if (te) return te.encode(str);
	var l = str.length;
	var ar = new u8(str.length + (str.length >> 1));
	var ai = 0;
	var w = function(v) {
		ar[ai++] = v;
	};
	for (var i = 0; i < l; ++i) {
		if (ai + 5 > ar.length) {
			var n = new u8(ai + 8 + (l - i << 1));
			n.set(ar);
			ar = n;
		}
		var c = str.charCodeAt(i);
		if (c < 128 || latin1) w(c);
		else if (c < 2048) w(192 | c >> 6), w(128 | c & 63);
		else if (c > 55295 && c < 57344) c = 65536 + (c & 1047552) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
		else w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
	}
	return slc(ar, 0, ai);
}
/**
* Converts a Uint8Array to a string
* @param dat The data to decode to string
* @param latin1 Whether or not to interpret the data as Latin-1. This should
*               not need to be true unless encoding to binary string.
* @returns The original UTF-8/Latin-1 string
*/
function strFromU8(dat, latin1) {
	if (latin1) {
		var r = "";
		for (var i = 0; i < dat.length; i += 16384) r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
		return r;
	} else if (td) return td.decode(dat);
	else {
		var _a = dutf8(dat), s = _a.s, r = _a.r;
		if (r.length) err(8);
		return s;
	}
}
var slzh = function(d, b) {
	return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
	var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
	var _a = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a[0], su = _a[1], off = _a[2];
	return [
		b2(d, b + 10),
		sc,
		su,
		fn,
		es + efl + b2(d, b + 32),
		off
	];
};
var z64hs = function(d, b, l, z, sc, su, off) {
	var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
	var nf = nsc + nsu + noff;
	if (z && nf) {
		for (; b + 4 < e; b += 4 + b2(d, b + 2)) if (b2(d, b) == 1) return [
			nsc ? b8(d, b + 4 + 8 * nsu) : sc,
			nsu ? b8(d, b + 4) : su,
			noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
			1
		];
		if (z < 2) err(13);
	}
	return [
		sc,
		su,
		off,
		0
	];
};
var exfl = function(ex) {
	var le = 0;
	if (ex) for (var k in ex) {
		var l = ex[k].length;
		if (l > 65535) err(9);
		le += l + 4;
	}
	return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
	var fl = fn.length, ex = f.extra, col = co && co.length;
	var exl = exfl(ex);
	wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
	if (ce != null) d[b++] = 20, d[b++] = f.os;
	d[b] = 20, b += 2;
	d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
	d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
	var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
	if (y < 0 || y > 119) err(10);
	wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
	if (c != -1) {
		wbytes(d, b, f.crc);
		wbytes(d, b + 4, c < 0 ? -c - 2 : c);
		wbytes(d, b + 8, f.size);
	}
	wbytes(d, b + 12, fl);
	wbytes(d, b + 14, exl), b += 16;
	if (ce != null) {
		wbytes(d, b, col);
		wbytes(d, b + 6, f.attrs);
		wbytes(d, b + 10, ce), b += 14;
	}
	d.set(fn, b);
	b += fl;
	if (exl) for (var k in ex) {
		var exf = ex[k], l = exf.length;
		wbytes(d, b, +k);
		wbytes(d, b + 2, l);
		d.set(exf, b + 4), b += 4 + l;
	}
	if (col) d.set(co, b), b += col;
	return b;
};
var wzf = function(o, b, c, d, e) {
	wbytes(o, b, 101010256);
	wbytes(o, b + 8, c);
	wbytes(o, b + 10, c);
	wbytes(o, b + 12, d);
	wbytes(o, b + 16, e);
};
/**
* Synchronously creates a ZIP file. Prefer using `zip` for better performance
* with more than one file.
* @param data The directory structure for the ZIP archive
* @param opts The main options, merged with per-file options
* @returns The generated ZIP archive
*/
function zipSync(data, opts) {
	if (!opts) opts = {};
	var r = {};
	var files = [];
	fltn(data, "", r, opts);
	var o = 0;
	var tot = 0;
	for (var fn in r) {
		var _a = r[fn], file = _a[0], p = _a[1];
		var compression = p.level == 0 ? 0 : 8;
		var f = strToU8(fn), s = f.length;
		var com = p.comment, m = com && strToU8(com), ms = m && m.length;
		var exl = exfl(p.extra);
		if (s > 65535) err(11);
		var d = compression ? deflateSync(file, p) : file, l = d.length;
		var c = crc();
		c.p(file);
		files.push(mrg(p, {
			size: file.length,
			crc: c.d(),
			c: d,
			f,
			m,
			u: s != fn.length || m && com.length != ms,
			o,
			compression
		}));
		o += 30 + s + exl + l;
		tot += 76 + 2 * (s + exl) + (ms || 0) + l;
	}
	var out = new u8(tot + 22), oe = o, cdl = tot - o;
	for (var i = 0; i < files.length; ++i) {
		var f = files[i];
		wzh(out, f.o, f, f.f, f.u, f.c.length);
		var badd = 30 + f.f.length + exfl(f.extra);
		out.set(f.c, f.o + badd);
		wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
	}
	wzf(out, o, files.length, cdl, oe);
	return out;
}
/**
* Synchronously decompresses a ZIP archive. Prefer using `unzip` for better
* performance with more than one file.
* @param data The raw compressed ZIP file
* @param opts The ZIP extraction options
* @returns The decompressed files
*/
function unzipSync(data, opts) {
	var files = {};
	var e = data.length - 22;
	for (; b4(data, e) != 101010256; --e) if (!e || data.length - e > 65558) err(13);
	var c = b2(data, e + 8);
	if (!c) return {};
	var o = b4(data, e + 16);
	var z = b4(data, e - 20) == 117853008;
	if (z) {
		var ze = b4(data, e - 12);
		z = b4(data, ze) == 101075792;
		if (z) {
			c = b4(data, ze + 32);
			o = b4(data, ze + 48);
		}
	}
	var fltr = opts && opts.filter;
	for (var i = 0; i < c; ++i) {
		var _a = zh(data, o, z), c_2 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
		o = no;
		if (!fltr || fltr({
			name: fn,
			size: sc,
			originalSize: su,
			compression: c_2
		})) if (!c_2) files[fn] = slc(data, b, b + sc);
		else if (c_2 == 8) files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
		else err(14, "unknown compression type " + c_2);
	}
	return files;
}
//#endregion
//#region src/host/labels.ts
const DEFAULT_CLEARANCE = 2;
const DEFAULT_LEADER_THRESHOLD = 14;
const DEFAULT_OWN_RADIUS = 7;
/** Label box geometry relative to the text anchor (baseline, left edge). */
const ASCENT_RATIO = .8;
const DESCENT_RATIO = .3;
const GRID_CELL = 12;
function textBox(x, y, size, width) {
	return {
		left: x,
		top: y - size * ASCENT_RATIO,
		right: x + width,
		bottom: y + size * DESCENT_RATIO
	};
}
function boxHeight(fontPx) {
	return fontPx * 1.1;
}
function decodeEntities(value) {
	return value.replace(/<[^>]*>/gu, "").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&quot;/gu, "\"").replace(/&#39;|&apos;/gu, "'").replace(/&nbsp;/gu, " ").replace(/&#(\d+);/gu, (_match, code) => String.fromCodePoint(Number(code))).replace(/&amp;/gu, "&").trim();
}
/**
* Text nodes of an exported SVG. GeoGebra splits a subscripted label such as `P_1` into a base
* run and a smaller run, so callers must cluster the result before matching it to an object.
*/
function parseSvgTextNodes(svg) {
	const nodes = [];
	for (const match of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gu)) {
		const attributes = match[1] ?? "";
		const content = decodeEntities(match[2] ?? "");
		const x = Number(/(?:^|\s)x="([-\d.]+)"/u.exec(attributes)?.[1]);
		const y = Number(/(?:^|\s)y="([-\d.]+)"/u.exec(attributes)?.[1]);
		const size = Number(/font-size="([\d.]+)px"/u.exec(attributes)?.[1]);
		if (content.length === 0 || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size)) continue;
		nodes.push({
			content,
			x,
			y,
			size
		});
	}
	return nodes;
}
/** Parameter count of each SVG path command, used to walk `d` data without mis-pairing numbers. */
const PATH_ARITY = {
	m: 2,
	l: 2,
	t: 2,
	h: 1,
	v: 1,
	c: 6,
	s: 4,
	q: 4,
	a: 7,
	z: 0
};
/**
* Sample the drawn geometry of an exported SVG into a point cloud. GeoGebra emits every curve,
* axis, and point marker as a `<path>`, so the cloud is a complete obstacle set for clearance
* checks. The `<defs>` block holds the clip rectangle and is skipped.
*/
function parseSvgObstaclePoints(svg) {
	const withoutDefs = svg.replace(/<defs\b[\s\S]*?<\/defs>/gu, "");
	const points = [];
	for (const match of withoutDefs.matchAll(/<path\b[^>]*\bd="([^"]*)"/gu)) {
		const tokens = (match[1] ?? "").match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gu);
		if (tokens === null) continue;
		let index = 0;
		let command = "m";
		let cursor = {
			x: 0,
			y: 0
		};
		let start = {
			x: 0,
			y: 0
		};
		const emit = (point) => {
			points.push(point);
			cursor = point;
		};
		while (index < tokens.length) {
			const token = tokens[index] ?? "";
			if (/[a-zA-Z]/u.test(token)) {
				command = token;
				index += 1;
				if (command.toLowerCase() === "z") {
					cursor = start;
					continue;
				}
			}
			const arity = PATH_ARITY[command.toLowerCase()];
			if (arity === void 0) break;
			const values = [];
			for (let step = 0; step < arity && index < tokens.length; step += 1) {
				const value = Number(tokens[index]);
				if (!Number.isFinite(value)) break;
				values.push(value);
				index += 1;
			}
			if (values.length < arity) break;
			const lower = command.toLowerCase();
			const base = command === lower ? cursor : {
				x: 0,
				y: 0
			};
			if (lower === "h") emit({
				x: base.x + (values[0] ?? 0),
				y: cursor.y
			});
			else if (lower === "v") emit({
				x: cursor.x,
				y: base.y + (values[0] ?? 0)
			});
			else if (lower === "c" || lower === "s" || lower === "q" || lower === "a") {
				for (let step = 0; step + 1 < values.length; step += 2) points.push({
					x: base.x + (values[step] ?? 0),
					y: base.y + (values[step + 1] ?? 0)
				});
				const endX = base.x + (values[values.length - 2] ?? 0);
				const endY = base.y + (values[values.length - 1] ?? 0);
				emit({
					x: endX,
					y: endY
				});
				if (lower === "a") emit({
					x: endX,
					y: endY
				});
			} else {
				emit({
					x: base.x + (values[0] ?? 0),
					y: base.y + (values[1] ?? 0)
				});
				if (lower === "m") start = cursor;
			}
		}
	}
	return points;
}
/** Group adjacent text runs (a base run plus its subscript) into one visual label. */
function clusterSvgTexts(nodes, widths) {
	const entries = nodes.map((node, index) => ({
		node,
		width: widths[index] ?? Math.max(node.size, node.content.length * node.size * .55)
	}));
	const clusters = [];
	for (const entry of entries) {
		const box = textBox(entry.node.x, entry.node.y, entry.node.size, entry.width);
		const host = clusters.find((candidate) => {
			if (Math.min(candidate.box.bottom, box.bottom) - Math.max(candidate.box.top, box.top) <= 0) return false;
			if (Math.max(candidate.box.left, box.left) - Math.min(candidate.box.right, box.right) > Math.max(candidate.box.bottom - candidate.box.top, box.bottom - box.top) * .6) return false;
			const sizes = candidate.parts.map((part) => part.node.size).concat(entry.node.size);
			return Math.min(...sizes) <= Math.max(...sizes) * .85;
		});
		if (host === void 0) {
			clusters.push({
				parts: [entry],
				box
			});
			continue;
		}
		host.parts.push(entry);
		host.box = {
			left: Math.min(host.box.left, box.left),
			top: Math.min(host.box.top, box.top),
			right: Math.max(host.box.right, box.right),
			bottom: Math.max(host.box.bottom, box.bottom)
		};
	}
	return clusters.map((cluster) => {
		const ordered = [...cluster.parts].sort((a, b) => a.node.x - b.node.x || b.node.size - a.node.size);
		const base = ordered[0] ?? cluster.parts[0];
		if (base === void 0) throw new Error("empty text cluster");
		return {
			content: ordered.map((part) => part.node.content).join(""),
			x: base.node.x,
			y: base.node.y,
			size: base.node.size,
			width: cluster.box.right - cluster.box.left,
			box: cluster.box
		};
	});
}
/** Normalize a label for comparison: GeoGebra renders `P_1` as `P` + subscript `1`. */
function normalizeLabelText(value) {
	return value.replace(/[\s_]/gu, "").replace(/[\u2012-\u2015\u2212]/gu, "-").replace(/[()]/gu, "").toLowerCase();
}
/**
* A label rendered as several equally sized runs that were not merged into one cluster (for example
* a long caption-mode string). Returns the runs whose concatenation equals the wanted text.
*/
function findTextSequence(clusters, wanted) {
	const ordered = [...clusters].sort((a, b) => a.x - b.x || a.y - b.y);
	for (let start = 0; start < ordered.length; start += 1) {
		let text = "";
		const picked = [];
		for (let index = start; index < ordered.length; index += 1) {
			const cluster = ordered[index];
			if (cluster === void 0) break;
			const previous = picked[picked.length - 1];
			if (previous !== void 0) {
				const gap = cluster.box.left - previous.box.right;
				const tolerance = Math.max(cluster.size, previous.size) * .6;
				if (gap > tolerance || Math.abs(cluster.y - previous.y) > tolerance) break;
			}
			picked.push(cluster);
			text += normalizeLabelText(cluster.content);
			if (text === wanted) return picked;
			if (!wanted.startsWith(text)) break;
		}
	}
	return null;
}
/** Union of several runs, presented as one label for the layout. */
function mergeClusters(clusters) {
	const first = clusters[0];
	if (first === void 0) throw new Error("cannot merge an empty run list");
	const box = clusters.reduce((union, cluster) => ({
		left: Math.min(union.left, cluster.box.left),
		top: Math.min(union.top, cluster.box.top),
		right: Math.max(union.right, cluster.box.right),
		bottom: Math.max(union.bottom, cluster.box.bottom)
	}), first.box);
	return {
		content: clusters.map((cluster) => cluster.content).join(""),
		x: first.x,
		y: first.y,
		size: first.size,
		width: box.right - box.left,
		box
	};
}
/**
* Pair each requested label with its rendered text run: prefer an exact text match (as one run or
* as a sequence of adjacent runs), then fall back to the run closest to the object. Labels with no
* plausible run are left alone.
*/
function matchLabels(labels, clusters) {
	const taken = /* @__PURE__ */ new Set();
	const matched = [];
	const unmatched = [];
	for (const request of labels) {
		const wanted = normalizeLabelText(request.text);
		const candidates = clusters.filter((cluster) => !taken.has(cluster));
		const distance = (cluster) => Math.hypot(cluster.x - request.anchorX, cluster.y - request.anchorY);
		let cluster = candidates.filter((cluster) => normalizeLabelText(cluster.content) === wanted).sort((a, b) => distance(a) - distance(b))[0];
		if (cluster === void 0) {
			const sequence = findTextSequence(candidates, wanted);
			if (sequence !== null) {
				cluster = mergeClusters(sequence);
				for (const part of sequence) taken.add(part);
			}
		}
		if (cluster === void 0) cluster = candidates.filter((candidate) => distance(candidate) <= 48 + request.fontPx * 2).sort((a, b) => distance(a) - distance(b))[0];
		if (cluster === void 0) {
			unmatched.push(request);
			continue;
		}
		taken.add(cluster);
		matched.push({
			request,
			cluster
		});
	}
	return {
		matched,
		unmatched
	};
}
var ObstacleGrid = class {
	cells = /* @__PURE__ */ new Map();
	constructor(points) {
		for (const point of points) {
			const key = `${Math.floor(point.x / GRID_CELL)}:${Math.floor(point.y / GRID_CELL)}`;
			const bucket = this.cells.get(key);
			if (bucket === void 0) this.cells.set(key, [point]);
			else bucket.push(point);
		}
	}
	/** Number of obstacle points inside the box expanded by `clearance` on every side. */
	count(box, clearance) {
		const left = Math.floor((box.left - clearance) / GRID_CELL);
		const right = Math.floor((box.right + clearance) / GRID_CELL);
		const top = Math.floor((box.top - clearance) / GRID_CELL);
		const bottom = Math.floor((box.bottom + clearance) / GRID_CELL);
		let hits = 0;
		for (let cellX = left; cellX <= right; cellX += 1) for (let cellY = top; cellY <= bottom; cellY += 1) {
			const bucket = this.cells.get(`${cellX}:${cellY}`);
			if (bucket === void 0) continue;
			for (const point of bucket) if (point.x >= box.left - clearance && point.x <= box.right + clearance && point.y >= box.top - clearance && point.y <= box.bottom + clearance) hits += 1;
		}
		return hits;
	}
};
function overlaps(a, b, pad = 0) {
	return a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad;
}
function intersectionArea(a, b) {
	const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
	const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
	return width > 0 && height > 0 ? width * height : 0;
}
function translate(box, dx, dy) {
	return {
		left: box.left + dx,
		top: box.top + dy,
		right: box.right + dx,
		bottom: box.bottom + dy
	};
}
/** Candidate translations: the default position first, then a ring of directions at growing radii. */
function candidateOffsets(fontPx) {
	const offsets = [{
		dx: 0,
		dy: 0
	}];
	const radii = [
		fontPx * .75,
		fontPx * 1.5,
		fontPx * 2.5,
		fontPx * 4
	];
	for (const radius of radii) {
		const step = Math.round(radius);
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, -1],
			[0, 1],
			[1, -1],
			[-1, -1],
			[1, 1],
			[-1, 1]
		]) offsets.push({
			dx: dx * step,
			dy: dy * step
		});
	}
	return offsets;
}
/**
* Choose a collision-free pixel offset for every label. Placement is greedy, most-constrained
* label first, and later labels treat earlier labels' boxes as obstacles so two labels never
* overlap.
*/
function placeLabels(options) {
	const clearance = options.clearance ?? DEFAULT_CLEARANCE;
	const leaderThreshold = options.leaderThreshold ?? DEFAULT_LEADER_THRESHOLD;
	const ownRadius = options.ownRadius ?? DEFAULT_OWN_RADIUS;
	const inset = options.frame.inset ?? 2;
	const frame = {
		left: inset,
		top: inset,
		right: options.frame.width - inset,
		bottom: options.frame.height - inset
	};
	const { matched, unmatched } = matchLabels(options.labels, options.clusters);
	const matchedClusters = new Set(matched.map((entry) => entry.cluster));
	const reserved = [...options.reservedBoxes, ...options.clusters.filter((cluster) => !matchedClusters.has(cluster)).map((cluster) => cluster.box)];
	const pending = matched.map(({ request, cluster }) => {
		const box = textBox(cluster.x, cluster.y, request.fontPx, cluster.width);
		const own = new ObstacleGrid(options.obstacles.filter((point) => Math.hypot(point.x - request.anchorX, point.y - request.anchorY) > ownRadius));
		return {
			request,
			cluster,
			box,
			own,
			conflictsBefore: own.count(box, clearance)
		};
	});
	pending.sort((a, b) => b.conflictsBefore - a.conflictsBefore);
	const placements = [];
	const occupied = [];
	let remaining = 0;
	const score = (candidate, dx, dy) => {
		const box = translate(candidate.box, dx, dy);
		const hits = candidate.own.count(box, clearance);
		let penalty = hits * 4;
		const overflow = Math.max(0, frame.left - box.left) + Math.max(0, box.right - frame.right) + Math.max(0, frame.top - box.top) + Math.max(0, box.bottom - frame.bottom);
		penalty += overflow * 25;
		for (const reservedBox of reserved) if (overlaps(box, reservedBox, clearance)) penalty += 60 + intersectionArea(box, reservedBox) * .5;
		for (const other of occupied) if (overlaps(box, other, clearance)) penalty += 400 + intersectionArea(box, other);
		if (overlaps(box, textBox(candidate.request.anchorX, candidate.request.anchorY, candidate.request.fontPx, 0), 1)) penalty += 120;
		penalty += Math.hypot(dx, dy) * .6;
		return {
			penalty,
			hits
		};
	};
	for (const candidate of pending) {
		let best = score(candidate, 0, 0);
		let bestOffset = {
			dx: 0,
			dy: 0
		};
		if (best.penalty > 0) for (const offset of candidateOffsets(candidate.request.fontPx)) {
			if (offset.dx === 0 && offset.dy === 0) continue;
			const current = score(candidate, offset.dx, offset.dy);
			if (current.penalty < best.penalty - 1e-9) {
				best = current;
				bestOffset = offset;
			}
		}
		const box = translate(candidate.box, bestOffset.dx, bestOffset.dy);
		occupied.push(box);
		remaining += best.hits;
		const displacement = Math.hypot(bestOffset.dx, bestOffset.dy);
		placements.push({
			name: candidate.request.name,
			dx: bestOffset.dx,
			dy: bestOffset.dy,
			displaced: displacement >= leaderThreshold,
			conflicts: best.hits,
			conflictsBefore: candidate.conflictsBefore,
			box,
			leader: leaderAnchor(box, candidate.request.anchorX, candidate.request.anchorY)
		});
	}
	for (const request of unmatched) {
		const height = boxHeight(request.fontPx);
		const box = {
			left: request.anchorX,
			top: request.anchorY - height,
			right: request.anchorX,
			bottom: request.anchorY
		};
		placements.push({
			name: request.name,
			dx: 0,
			dy: 0,
			displaced: false,
			conflicts: 0,
			conflictsBefore: 0,
			box,
			leader: {
				x: request.anchorX,
				y: request.anchorY
			}
		});
	}
	return {
		placements,
		conflicts: remaining
	};
}
/** Point on the label box boundary closest to the object, so a leader line stops at the text. */
function leaderAnchor(box, anchorX, anchorY) {
	return {
		x: Math.min(Math.max(anchorX, box.left), box.right),
		y: Math.min(Math.max(anchorY, box.top), box.bottom)
	};
}
//#endregion
//#region src/host/renderer.ts
const FONT_SIZE_DIRECTIVE = /^\s*SetFontSize\(\s*([A-Za-z][A-Za-z0-9_]*)\s*,\s*(\d+(?:\.\d+)?)\s*\)\s*$/u;
const MAX_TEXT_SIZE_PX = 48;
/** Typography tiers from the plugin contract, applied to renderer-created title and caption. */
const TITLE_FONT_PX = 24;
const CAPTION_FONT_PX = 16;
/** GeoGebra's own default label/tick size, reported when no label font was requested. */
const DEFAULT_LABEL_FONT_PX = 16;
/**
* GeoGebra's applet frame draws a 1 px border on every side, and the exported graphics view is the
* frame's inner box. The viewport is therefore enlarged by this amount so the export matches the
* requested display size exactly.
*/
const FRAME_BORDER_PX = 1;
/** Embedded images are placed by their DPI metadata, so DPI must track the raster multiplier. */
const BASE_DPI = 96;
function pngMetadata(base64) {
	const buffer = Buffer.from(base64, "base64");
	if (buffer.length < 24 || buffer.toString("ascii", 12, 16) !== "IHDR") throw new Error("GeoGebra PNG output is not a valid PNG");
	let offset = 8;
	let dpi = BASE_DPI;
	while (offset + 12 <= buffer.length) {
		const length = buffer.readUInt32BE(offset);
		const type = buffer.toString("ascii", offset + 4, offset + 8);
		if (type === "pHYs" && offset + 17 <= buffer.length && buffer.readUInt8(offset + 16) === 1) dpi = Math.round(buffer.readUInt32BE(offset + 8) * .0254);
		if (type === "IEND") break;
		offset += 12 + length;
	}
	return {
		width: buffer.readUInt32BE(16),
		height: buffer.readUInt32BE(20),
		dpi
	};
}
/** A viewBox makes the SVG scale losslessly when a consumer embeds it at another width. */
function withViewBox(svg, width, height) {
	if (/<svg\b[^>]*\bviewBox=/u.test(svg)) return svg;
	return svg.replace(/<svg\b([^>]*)>/u, (_match, attributes) => `<svg${attributes} viewBox="0 0 ${width} ${height}">`);
}
function splitFontSizeDirectives(commands) {
	if (commands === void 0) return {
		commands: void 0,
		fontSizes: []
	};
	const executable = [];
	const fontSizes = [];
	for (const command of commands) {
		const match = FONT_SIZE_DIRECTIVE.exec(command);
		if (match === null) {
			executable.push(command);
			continue;
		}
		const label = match[1];
		const pixels = Number(match[2]);
		if (label === void 0 || !Number.isFinite(pixels) || pixels < 12 || pixels > MAX_TEXT_SIZE_PX) throw new Error(`SetFontSize requires a text label and a pixel size from 12 to ${MAX_TEXT_SIZE_PX}`);
		fontSizes.push({
			label,
			pixels
		});
	}
	return {
		commands: executable,
		fontSizes
	};
}
function textElementPattern(label) {
	return new RegExp(`(<element\\s+type="text"\\s+label="${label}"[^>]*>)([\\s\\S]*?)(</element>)`, "u");
}
function persistGgbFontSizes(base64, directives) {
	if (directives.length === 0) return base64;
	const archive = unzipSync(Buffer.from(base64, "base64"));
	const xmlBytes = archive["geogebra.xml"];
	if (xmlBytes === void 0) throw new Error("GeoGebra GGB output is missing geogebra.xml");
	let xml = strFromU8(xmlBytes);
	const guiMatch = /<font size="(\d+)"\/>/u.exec(xml);
	const guiFont = guiMatch?.[1] === void 0 ? DEFAULT_LABEL_FONT_PX : Number(guiMatch[1]);
	for (const directive of directives) {
		const elementPattern = textElementPattern(directive.label);
		const match = elementPattern.exec(xml);
		if (match === null || match[1] === void 0 || match[2] === void 0 || match[3] === void 0) throw new Error(`SetFontSize target is not a persisted text object: ${directive.label}`);
		const existing = /<font\b[^>]*sizeM="([\d.]+)"[^>]*\/>/u.exec(match[2]);
		if (existing !== null && Math.abs(Number(existing[1]) * guiFont - directive.pixels) < .51) continue;
		const font = `<font serif="false" sizeM="${Math.round(directive.pixels / guiFont * 1e4) / 1e4}" size="0" style="0"/>`;
		const body = existing === null ? `${match[2]}\t${font}\n` : match[2].replace(/<font\b[^>]*\/>/u, font);
		xml = xml.replace(elementPattern, `${match[1]}${body}${match[3]}`);
	}
	archive["geogebra.xml"] = strToU8(xml);
	return Buffer.from(zipSync(archive, { level: 6 })).toString("base64");
}
/** The GUI font size governs every automatic label and axis tick number in the construction. */
function patchGgbLabelFont(base64, pixels) {
	const archive = unzipSync(Buffer.from(base64, "base64"));
	const xmlBytes = archive["geogebra.xml"];
	if (xmlBytes === void 0) throw new Error("GeoGebra GGB output is missing geogebra.xml");
	const xml = strFromU8(xmlBytes);
	const patched = /<font size="\d+"\/>/u.test(xml) ? xml.replace(/<font size="\d+"\/>/u, `<font size="${Math.round(pixels)}"/>`) : xml;
	if (patched === xml) throw new Error("GeoGebra GGB output has no GUI font element to patch");
	archive["geogebra.xml"] = strToU8(patched);
	return Buffer.from(zipSync(archive, { level: 6 })).toString("base64");
}
function html(width, height) {
	return `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body,#app{width:100%;height:100%;margin:0;overflow:hidden}</style>
<script src="https://www.geogebra.org/apps/deployggb.js"><\/script></head>
<body><div id="app"></div><script>
window.__ggbError = null;
window.addEventListener('error', event => { window.__ggbError = event.message || 'page error'; });
function boot() {
  if (typeof GGBApplet !== 'function') { setTimeout(boot, 50); return; }
  const applet = new GGBApplet({ appName:'classic', width:${width}, height:${height}, perspective:'G', showToolBar:false,
    showMenuBar:false, showAlgebraInput:false, showResetIcon:false, showZoomButtons:false,
    enableRightClick:false, language:'en', appletOnLoad(api) { window.ggbApplet = api; window.__ggbReady = true; } }, true);
  applet.inject('app');
}
boot();
<\/script></body></html>`;
}
/**
* Page-side runtime shared by every evaluation step. It lives on `window.__dsh` so the host can
* drive the applet in several steps: build, measure, place labels, export.
*
* `String.raw` keeps the regular expressions below readable — they are meant for the page, so a
* single backslash is what the browser must receive.
*/
const PAGE_RUNTIME = String.raw`
window.__dsh = (() => {
  const app = () => window.ggbApplet;
  const STYLE_COMMAND = /^(Set|Show|Hide|Start|Stop|Play|Pause|Zoom|Pan|Select|Delete|Rename|Update|Copy|Run|Redo|Undo)/;
  const decode = value => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const stripExpression = xml => xml.replace(/^<expression[^>]*\/>\s*/u, '').replace(/\s+$/u, '');
  return {
    /**
     * Run the model's commands one at a time.
     *
     * evalCommandGetLabels returns null both for a failed command and for a style command that
     * creates no object, so a command that produced no label is accepted when it still changed the
     * construction. Style commands are also accepted when they are a no-op, which is what makes
     * ShowLabel(A, true) work on an object whose label is already visible.
     */
    run(commands) {
      const api = app();
      const failures = [];
      for (const raw of commands) {
        const command = String(raw).trim();
        if (command.length === 0) continue;
        const isStyle = STYLE_COMMAND.test(command);
        const beforeXml = isStyle ? null : api.getXML();
        let created = null;
        try { created = api.evalCommandGetLabels(command); } catch (error) { failures.push({ command, reason: String((error && error.message) || error) }); continue; }
        if (created !== null && created !== '') continue;
        if (isStyle) continue;
        if (api.getXML() !== beforeXml) continue;
        failures.push({ command, reason: 'GeoGebra did not accept this command' });
      }
      return failures;
    },
    applyFonts(directives) {
      const api = app();
      // sizeM is a multiple of the GUI font size, so the expected value moves with label_font_px.
      const guiMatch = /<font size="(\d+)"\/>/u.exec(api.getXML());
      const gui = guiMatch ? Number(guiMatch[1]) : 16;
      for (const directive of directives) {
        if (api.getObjectType(directive.label) !== 'text') throw new Error('SetFontSize target is not a text object: ' + directive.label);
        api.setFont(directive.label, directive.pixels, false, false);
        // GeoGebra omits <font> entirely when the size equals the GUI font, and stores the
        // multiplier at full precision otherwise, so compare effective pixels rather than text.
        const font = /<font\b[^>]*sizeM="([\d.]+)"[^>]*\/>/u.exec(api.getXML(directive.label));
        const effective = font === null ? gui : Number(font[1]) * gui;
        if (Math.abs(effective - directive.pixels) >= 0.51) {
          throw new Error('SetFontSize did not persist for ' + directive.label + ' (got ' + effective + ' px, wanted ' + directive.pixels + ' px)');
        }
      }
      return directives.length;
    },
    /** Current font of every text object, so a GUI-font change cannot silently resize them. */
    snapshotTextFonts() {
      const api = app();
      const guiMatch = /<font size="(\d+)"\/>/u.exec(api.getXML());
      const gui = guiMatch ? Number(guiMatch[1]) : 16;
      const list = [];
      for (const name of api.getAllObjectNames()) {
        if (api.getObjectType(name) !== 'text') continue;
        const match = /<font[^>]*sizeM="([\d.]+)"/u.exec(api.getXML(name));
        list.push({ label: name, pixels: match ? Math.round(Number(match[1]) * gui) : gui });
      }
      return list;
    },
    applyView(input) {
      const api = app();
      api.setCoordSystem(input.xMin, input.xMax, input.yMin, input.yMax);
      api.setGraphicsOptions(1, { grid: input.grid, axes: { x: { showNumbers: input.axisNumbers }, y: { showNumbers: input.axisNumbers } } });
      if (typeof input.axisStep === 'number') api.setAxisSteps(1, input.axisStep, input.axisStep);
      if (input.axisLabels) api.setAxisLabels(1, input.axisLabels.x || '', input.axisLabels.y || '', '');
      if (input.axisUnits) api.setAxisUnits(1, input.axisUnits.x || '', input.axisUnits.y || '', '');
      return true;
    },
    effectiveLabelFont(fallback) {
      const match = /<font size="(\d+)"\/>/u.exec(app().getXML());
      return match ? Number(match[1]) : fallback;
    },
    /** Screen position of every object that carries a visible automatic label. */
    scanLabels() {
      const api = app();
      const view = JSON.parse(api.getViewProperties(1));
      const toPx = (x, y) => ({ x: (x - view.xMin) / view.invXscale, y: view.height - (y - view.yMin) / view.invYscale });
      const coordinates = name => {
        const type = api.getObjectType(name);
        if (type === 'point') return [{ x: api.getXcoord(name), y: api.getYcoord(name) }];
        const match = /^[A-Za-z_][A-Za-z0-9_]*\((.*)\)$/u.exec(api.getCommandString(name));
        if (match === null) return [];
        return match[1].split(',').map(part => part.trim())
          .filter(part => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(part))
          .filter(part => api.getObjectType(part) === 'point')
          .map(part => ({ x: api.getXcoord(part), y: api.getYcoord(part) }));
      };
      const anchorOf = (name, type) => {
        const points = coordinates(name);
        if (points.length === 0) return null;
        if (type === 'point') return points[0];
        if (type === 'polygon') {
          return {
            x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
            y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
          };
        }
        if (points.length < 2) return null;
        return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      };
      const labels = [];
      for (const name of api.getAllObjectNames()) {
        const type = api.getObjectType(name);
        if (type === 'text') continue;
        if (!api.getVisible(name) || !api.getLabelVisible(name)) continue;
        const xml = api.getXML(name);
        const mode = Number((/<labelMode val="(\d+)"\/>/u.exec(xml) || [])[1] || 0);
        const caption = /<caption val="([^"]*)"\/>/u.exec(xml);
        let text = name;
        if (mode === 3 && caption !== null) text = decode(caption[1]);
        else if (mode === 2) text = api.getValueString(name);
        else if (mode === 1) text = name + ' = ' + api.getValueString(name);
        const anchor = anchorOf(name, type);
        if (anchor === null) continue;
        const screen = toPx(anchor.x, anchor.y);
        labels.push({ name, type, text, anchorX: screen.x, anchorY: screen.y, userX: anchor.x, userY: anchor.y });
      }
      return { labels, view };
    },
    /**
     * Create the figure title and caption as sized, horizontally centred text objects. The width is
     * measured in the page, so the centring is exact rather than an estimate.
     */
    addAnnotations(items) {
      const api = app();
      if (items.length === 0) return [];
      const view = JSON.parse(api.getViewProperties(1));
      const context = document.createElement('canvas').getContext('2d');
      const taken = new Set(api.getAllObjectNames());
      const created = [];
      for (const item of items) {
        context.font = item.fontPx + 'px geogebra-sans-serif, sans-serif';
        const textWidth = context.measureText(item.text).width;
        const x = view.xMin + ((view.width - textWidth) / 2) * view.invXscale;
        const y = item.role === 'title'
          ? view.yMin + (view.height - item.marginPx) * view.invYscale
          : view.yMin + item.marginPx * view.invYscale;
        let label = item.role === 'title' ? 'dshTitle' : 'dshCaption';
        while (taken.has(label)) label += '_';
        taken.add(label);
        api.evalCommand(label + '=Text(' + JSON.stringify(item.text) + ',(' + x + ',' + y + '))');
        api.setFont(label, item.fontPx, false, false);
        created.push({ label, pixels: item.fontPx });
      }
      return created;
    },
    measure(items) {
      const context = document.createElement('canvas').getContext('2d');
      return items.map(item => {
        context.font = item.size + 'px geogebra-sans-serif, sans-serif';
        return context.measureText(item.text).width;
      });
    },
    /** Apply pixel label offsets through the construction property and draw leader lines. */
    applyLabels(payload) {
      const api = app();
      const view = payload.view;
      const toUser = (x, y) => ({ x: view.xMin + x * view.invXscale, y: view.yMin + (view.height - y) * view.invYscale });
      let applied = 0;
      for (const item of payload.offsets) {
        if (item.dx === 0 && item.dy === 0) continue;
        const xml = stripExpression(api.getXML(item.name));
        if (xml.length === 0) continue;
        const offset = '<labelOffset x="' + item.dx + '" y="' + item.dy + '"/>';
        const patched = /<labelOffset\b/u.test(xml)
          ? xml.replace(/<labelOffset[^>]*\/>/u, offset)
          : xml.replace(/<show[^>]*\/>/u, match => match + '\n\t' + offset);
        api.evalXML(patched);
        applied += 1;
      }
      let leaders = 0;
      for (const leader of payload.leaders) {
        const from = toUser(leader.fromX, leader.fromY);
        const to = toUser(leader.toX, leader.toY);
        // A two-point Polyline is the whole leader: no helper points, so nothing to hide and no
        // stray objects in the saved construction.
        api.evalCommand(leader.segmentName + '=Polyline({(' + from.x + ',' + from.y + '),(' + to.x + ',' + to.y + ')})');
        api.evalCommand('SetLineThickness(' + leader.segmentName + ',1)');
        api.evalCommand('SetColor(' + leader.segmentName + ',0.55,0.55,0.55)');
        leaders += 1;
      }
      return { applied, leaders };
    },
    hideAutomaticLabels() {
      const api = app();
      let hidden = 0;
      for (const name of api.getAllObjectNames()) {
        if (api.getObjectType(name) === 'text') continue;
        if (!api.getLabelVisible(name)) continue;
        api.evalCommand('ShowLabel(' + name + ',false)');
        hidden += 1;
      }
      return hidden;
    },
  };
})()
`;
function chromeCandidates() {
	if (process.platform === "win32") return [
		process.env.GEOGEBRA_CHROME_PATH,
		process.env.CHROME_PATH,
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
	].filter((value) => value !== void 0);
	if (process.platform === "darwin") return [
		process.env.GEOGEBRA_CHROME_PATH,
		process.env.CHROME_PATH,
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
	].filter((value) => value !== void 0);
	return [
		process.env.GEOGEBRA_CHROME_PATH,
		process.env.CHROME_PATH,
		"/usr/bin/google-chrome",
		"/usr/bin/google-chrome-stable",
		"/usr/bin/chromium",
		"/usr/bin/chromium-browser"
	].filter((value) => value !== void 0);
}
function findChrome(explicit) {
	if (explicit !== void 0 && existsSync(explicit)) return explicit;
	const found = chromeCandidates().find(existsSync);
	if (found === void 0) throw new Error("GeoGebra rendering requires Chrome, Chromium, or Edge. Set GEOGEBRA_CHROME_PATH.");
	return found;
}
function abortError() {
	const error = /* @__PURE__ */ new Error("GeoGebra rendering was cancelled");
	error.name = "AbortError";
	return error;
}
async function delay(ms, signal) {
	if (signal.aborted) throw abortError();
	await new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener("abort", () => {
			clearTimeout(timer);
			reject(abortError());
		}, { once: true });
	});
}
async function debuggerAddress(profile, signal) {
	const activePort = join(profile, "DevToolsActivePort");
	for (let attempt = 0; attempt < 200; attempt += 1) {
		if (existsSync(activePort)) {
			const [port, browserPath] = (await readFile(activePort, "utf8")).trim().split(/\r?\n/u);
			if (port !== void 0 && browserPath !== void 0) return {
				port,
				browserPath
			};
		}
		await delay(50, signal);
	}
	throw new Error("Chrome DevTools endpoint did not become ready");
}
var CdpClient = class CdpClient {
	socket;
	nextId = 0;
	pending = /* @__PURE__ */ new Map();
	constructor(socket) {
		this.socket = socket;
		socket.addEventListener("message", (event) => {
			const message = JSON.parse(String(event.data));
			if (message.id === void 0) return;
			const waiter = this.pending.get(message.id);
			if (waiter === void 0) return;
			this.pending.delete(message.id);
			if (message.error !== void 0) waiter.reject(new Error(message.error.message ?? "Chrome DevTools error"));
			else waiter.resolve(message.result);
		});
	}
	static async connect(url, signal) {
		if (signal.aborted) throw abortError();
		const socket = new WebSocket(url);
		await new Promise((resolve, reject) => {
			socket.addEventListener("open", () => {
				resolve();
			}, { once: true });
			socket.addEventListener("error", () => {
				reject(/* @__PURE__ */ new Error("Could not connect to Chrome DevTools"));
			}, { once: true });
			signal.addEventListener("abort", () => {
				socket.close();
				reject(abortError());
			}, { once: true });
		});
		return new CdpClient(socket);
	}
	call(method, params = {}) {
		const id = ++this.nextId;
		this.socket.send(JSON.stringify({
			id,
			method,
			params
		}));
		return new Promise((resolve, reject) => {
			this.pending.set(id, {
				resolve: (value) => {
					resolve(value);
				},
				reject
			});
		});
	}
	async evaluate(expression) {
		const response = await this.call("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true
		});
		if (response.exceptionDetails !== void 0) {
			const description = response.exceptionDetails.exception?.description ?? response.exceptionDetails.text;
			throw new Error(description ?? "GeoGebra evaluation failed");
		}
		return response.result.value;
	}
	close() {
		this.socket.close();
	}
};
function terminate(processHandle) {
	if (processHandle.exitCode !== null) return;
	try {
		processHandle.kill();
	} catch {}
}
/**
* Decide the pixel offset of every automatic label.
*
* GeoGebra's placement is measured from the exported SVG (so no assumption about its defaults is
* needed), the drawn geometry becomes the obstacle set, and the result is applied as a
* `<labelOffset>` construction property, which keeps the labels dynamic and the figure editable.
*/
async function planLabels(cdp, scan, labels, width, height) {
	const svg = await cdp.evaluate("new Promise(resolve => window.ggbApplet.exportSVG(resolve))");
	const textNodes = parseSvgTextNodes(svg);
	const layout = placeLabels({
		labels,
		clusters: clusterSvgTexts(textNodes, await cdp.evaluate(`window.__dsh.measure(${JSON.stringify(textNodes.map((node) => ({
			text: node.content,
			size: node.size
		})))})`)),
		obstacles: parseSvgObstaclePoints(svg),
		reservedBoxes: [],
		frame: {
			width,
			height
		}
	});
	const byName = new Map(layout.placements.map((placement) => [placement.name, placement]));
	const offsets = layout.placements.filter((placement) => placement.dx !== 0 || placement.dy !== 0).map((placement) => ({
		name: placement.name,
		dx: placement.dx,
		dy: placement.dy
	}));
	const leaderInput = layout.placements.filter((placement) => placement.displaced);
	const taken = new Set(scan.labels.map((label) => label.name));
	const leaders = [];
	leaderInput.forEach((placement, index) => {
		const request = labels.find((label) => label.name === placement.name);
		if (request === void 0) return;
		let segmentName = `dshLead_${index + 1}`;
		while (taken.has(segmentName)) segmentName += "_";
		taken.add(segmentName);
		const distance = Math.hypot(placement.leader.x - request.anchorX, placement.leader.y - request.anchorY);
		const stub = Math.min(7, distance / 2);
		const ratio = distance === 0 ? 0 : stub / distance;
		leaders.push({
			segmentName,
			fromX: request.anchorX + (placement.leader.x - request.anchorX) * ratio,
			fromY: request.anchorY + (placement.leader.y - request.anchorY) * ratio,
			toX: placement.leader.x,
			toY: placement.leader.y
		});
	});
	return {
		reports: scan.labels.map((label) => {
			const placement = byName.get(label.name);
			return {
				name: label.name,
				dx: placement?.dx ?? 0,
				dy: placement?.dy ?? 0,
				displaced: placement?.displaced ?? false,
				conflicts: placement?.conflicts ?? 0,
				conflictsBefore: placement?.conflictsBefore ?? 0
			};
		}),
		offsets,
		leaders,
		conflicts: layout.conflicts
	};
}
async function renderGeoGebra(request) {
	if (request.commands === void 0 === (request.ggbBase64 === void 0)) throw new Error("Provide exactly one of commands or ggbBase64");
	const prepared = splitFontSizeDirectives(request.commands);
	const labelPlacement = request.labelPlacement ?? "smart";
	const labelLeaders = request.labelLeaders ?? true;
	const root = await mkdtemp(join(tmpdir(), "dsh-geogebra-"));
	const profile = join(root, "profile");
	const htmlPath = join(root, "index.html");
	const viewportWidth = request.width + FRAME_BORDER_PX * 2;
	const viewportHeight = request.height + FRAME_BORDER_PX * 2;
	await writeFile(htmlPath, html(viewportWidth, viewportHeight), "utf8");
	const child = spawn(findChrome(request.chromePath), [
		"--headless=new",
		"--disable-gpu",
		"--no-first-run",
		"--no-default-browser-check",
		"--remote-debugging-port=0",
		`--user-data-dir=${profile}`,
		`--window-size=${viewportWidth},${viewportHeight}`,
		"about:blank"
	], {
		stdio: "ignore",
		windowsHide: true
	});
	const cancel = () => {
		terminate(child);
	};
	request.signal.addEventListener("abort", cancel, { once: true });
	let cdp;
	try {
		const { port } = await debuggerAddress(profile, request.signal);
		const page = (await fetch(`http://127.0.0.1:${port}/json`, { signal: request.signal }).then((response) => response.json())).find((target) => target.type === "page");
		if (page === void 0) throw new Error("Chrome did not expose a page target");
		cdp = await CdpClient.connect(page.webSocketDebuggerUrl, request.signal);
		await cdp.call("Runtime.enable");
		await cdp.call("Page.enable");
		await cdp.call("Emulation.setDeviceMetricsOverride", {
			width: viewportWidth,
			height: viewportHeight,
			deviceScaleFactor: 1,
			mobile: false
		});
		await cdp.call("Page.navigate", { url: new URL(`file:///${htmlPath.replaceAll("\\", "/")}`).href });
		for (let attempt = 0; attempt < 600; attempt += 1) {
			const state = await cdp.evaluate("({ ready: window.__ggbReady === true, error: window.__ggbError })").catch(() => ({
				ready: false,
				error: null
			}));
			if (typeof state.error === "string" && state.error.length > 0) throw new Error(`GeoGebra page failed: ${state.error}`);
			if (state.ready) break;
			if (attempt === 599) throw new Error("GeoGebra applet did not become ready");
			await delay(100, request.signal);
		}
		await cdp.evaluate(`${PAGE_RUNTIME}\ntrue`);
		const dpi = Math.round(BASE_DPI * request.pngScale);
		const view = {
			xMin: request.xMin,
			xMax: request.xMax,
			yMin: request.yMin,
			yMax: request.yMax,
			pngScale: request.pngScale,
			grid: request.grid,
			axisNumbers: request.axisNumbers,
			...request.axisStep === void 0 ? {} : { axisStep: request.axisStep },
			...request.axisLabels === void 0 ? {} : { axisLabels: request.axisLabels },
			...request.axisUnits === void 0 ? {} : { axisUnits: request.axisUnits }
		};
		if (request.ggbBase64 !== void 0) await cdp.evaluate(`new Promise(resolve => window.ggbApplet.setBase64(${JSON.stringify(request.ggbBase64)}, resolve))`);
		else {
			const failures = await cdp.evaluate(`window.__dsh.run(${JSON.stringify(prepared.commands ?? [])})`);
			if (failures.length > 0) throw new Error(`GeoGebra rejected ${failures.length} command(s): ${failures.map((failure) => `${failure.command} (${failure.reason})`).join("; ")}`);
		}
		await cdp.evaluate(`window.__dsh.applyFonts(${JSON.stringify(prepared.fontSizes)})`);
		await cdp.evaluate(`window.__dsh.applyView(${JSON.stringify(view)})`);
		const annotationItems = [...request.title === void 0 ? [] : [{
			role: "title",
			text: request.title.text,
			fontPx: request.title.fontPx ?? TITLE_FONT_PX,
			marginPx: Math.round((request.title.fontPx ?? TITLE_FONT_PX) * .9) + 4
		}], ...request.caption === void 0 ? [] : [{
			role: "caption",
			text: request.caption.text,
			fontPx: request.caption.fontPx ?? CAPTION_FONT_PX,
			marginPx: Math.round((request.caption.fontPx ?? CAPTION_FONT_PX) * .5) + 4
		}]];
		const annotationFonts = await cdp.evaluate(`window.__dsh.addAnnotations(${JSON.stringify(annotationItems)})`);
		const textFontSizes = [...prepared.fontSizes, ...annotationFonts];
		let effectiveLabelFont = await cdp.evaluate(`window.__dsh.effectiveLabelFont(${DEFAULT_LABEL_FONT_PX})`);
		if (request.labelFontPx !== void 0 && Math.round(request.labelFontPx) !== effectiveLabelFont) {
			const textFonts = await cdp.evaluate("window.__dsh.snapshotTextFonts()");
			const patched = patchGgbLabelFont(await cdp.evaluate("new Promise(resolve => window.ggbApplet.getBase64(resolve))"), request.labelFontPx);
			await cdp.evaluate(`new Promise(resolve => window.ggbApplet.setBase64(${JSON.stringify(patched)}, resolve))`);
			await cdp.evaluate(`window.__dsh.applyFonts(${JSON.stringify([...textFonts, ...textFontSizes])})`);
			await cdp.evaluate(`window.__dsh.applyView(${JSON.stringify(view)})`);
			effectiveLabelFont = await cdp.evaluate(`window.__dsh.effectiveLabelFont(${DEFAULT_LABEL_FONT_PX})`);
		}
		let labelReports;
		let labelConflicts;
		if (labelPlacement === "off") await cdp.evaluate("window.__dsh.hideAutomaticLabels()");
		else if (labelPlacement === "smart") {
			const scan = await cdp.evaluate("window.__dsh.scanLabels()");
			if (scan.labels.length > 0) {
				const requests = scan.labels.map((label) => ({
					name: label.name,
					text: label.text,
					fontPx: effectiveLabelFont,
					anchorX: label.anchorX,
					anchorY: label.anchorY
				}));
				const plan = await planLabels(cdp, scan, requests, request.width, request.height);
				await cdp.evaluate(`window.__dsh.applyLabels(${JSON.stringify({
					view: scan.view,
					offsets: plan.offsets,
					leaders: labelLeaders ? plan.leaders : []
				})})`);
				labelReports = plan.reports;
				labelConflicts = plan.conflicts;
			} else {
				labelReports = [];
				labelConflicts = 0;
			}
		}
		const rendered = await cdp.evaluate(`(() => {
      const api = window.ggbApplet;
      const formats = ${JSON.stringify(request.formats)};
      const outputs = {};
      if (formats.includes('png')) outputs.png = api.getPNGBase64(${request.pngScale}, ${request.transparent}, ${dpi});
      const pending = [];
      if (formats.includes('svg')) pending.push(new Promise(resolve => api.exportSVG(resolve)).then(value => { outputs.svg = value; }));
      if (formats.includes('ggb')) pending.push(new Promise(resolve => api.getBase64(resolve)).then(value => { outputs.ggb = value; }));
      return Promise.all(pending).then(() => ({ objects: api.getAllObjectNames(), version: api.getVersion(), outputs }));
    })()`);
		const rawGgb = rendered.outputs.ggb;
		const outputs = rawGgb === void 0 || textFontSizes.length === 0 ? { ...rendered.outputs } : {
			...rendered.outputs,
			ggb: persistGgbFontSizes(rawGgb, textFontSizes)
		};
		const rawSvg = outputs.svg;
		if (rawSvg !== void 0) outputs.svg = withViewBox(rawSvg, request.width, request.height);
		const rawPng = outputs.png;
		return {
			objects: rendered.objects,
			version: rendered.version,
			display: {
				width: request.width,
				height: request.height
			},
			...rawPng === void 0 ? {} : { png: pngMetadata(rawPng) },
			...textFontSizes.length === 0 ? {} : { minFontPx: Math.min(...textFontSizes.map((directive) => directive.pixels)) },
			labelFontPx: effectiveLabelFont,
			...labelReports === void 0 ? {} : { labels: labelReports },
			...labelConflicts === void 0 ? {} : { labelConflicts },
			outputs
		};
	} finally {
		request.signal.removeEventListener("abort", cancel);
		if (cdp !== void 0) {
			try {
				await cdp.call("Browser.close");
			} catch {}
			cdp.close();
		}
		terminate(child);
		await new Promise((resolve) => {
			if (child.exitCode !== null) {
				resolve();
				return;
			}
			const timer = setTimeout(resolve, 2e3);
			child.once("exit", () => {
				clearTimeout(timer);
				resolve();
			});
		});
		await rm(root, {
			recursive: true,
			force: true,
			maxRetries: 20,
			retryDelay: 100
		});
	}
}
//#endregion
//#region src/host/chart.ts
const DEFAULT_MARGIN = .08;
/** Half-width added to a degenerate (zero-range) axis so that min < max still holds. */
const DEGENERATE_HALF_SPAN = .5;
/**
* Significant digits kept for a data coordinate. 15 digits is below the ~17 needed to be exact,
* but exactly what strips IEEE-754 noise such as 0.30000000000000004 down to 0.3.
*/
const COORDINATE_PRECISION = 15;
const STYLES = [
	"line",
	"points",
	"line+points"
];
const FIT_MODELS = [
	"linear",
	"poly2",
	"poly3",
	"poly4",
	"exp",
	"log",
	"pow",
	"sin"
];
/** Rewrites exponential notation as a plain decimal so GeoGebra never sees `1e-7`. */
function expandExponential(text) {
	const match = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/u.exec(text);
	if (match === null) return text;
	const sign = (match[1] ?? "") === "-" ? "-" : "";
	const integerPart = match[2] ?? "0";
	const fractionPart = match[3] ?? "";
	const exponent = Number(match[4] ?? "0");
	const digits = integerPart + fractionPart;
	const pointIndex = integerPart.length + exponent;
	if (pointIndex <= 0) return `${sign}0.${"0".repeat(-pointIndex)}${digits}`;
	if (pointIndex >= digits.length) return `${sign}${digits}${"0".repeat(pointIndex - digits.length)}`;
	return `${sign}${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`;
}
/** Compact, round-trippable, exponential-free literal for a finite coordinate. */
function formatNumber(value) {
	if (value === 0) return "0";
	return expandExponential(String(Number.parseFloat(value.toPrecision(COORDINATE_PRECISION))));
}
/** GeoGebra fit command for one model, e.g. `FitPoly(L_1,2)`. */
function fitCommand(model, listName) {
	switch (model) {
		case "linear": return `FitLine(${listName})`;
		case "poly2": return `FitPoly(${listName},2)`;
		case "poly3": return `FitPoly(${listName},3)`;
		case "poly4": return `FitPoly(${listName},4)`;
		case "exp": return `FitExp(${listName})`;
		case "log": return `FitLog(${listName})`;
		case "pow": return `FitPow(${listName})`;
		case "sin": return `FitSin(${listName})`;
	}
}
/** Parses '#rgb' / '#rrggbb' (the '#' is optional) into 0-255 channels; null when unparseable. */
function parseHexColor(color) {
	const text = color.trim().replace(/^#/u, "");
	const expanded = /^[0-9a-fA-F]{3}$/u.test(text) ? text.split("").map((character) => character + character).join("") : text;
	if (!/^[0-9a-fA-F]{6}$/u.test(expanded)) return null;
	return [
		Number.parseInt(expanded.slice(0, 2), 16),
		Number.parseInt(expanded.slice(2, 4), 16),
		Number.parseInt(expanded.slice(4, 6), 16)
	];
}
/**
* GeoGebra's `SetColor` command takes channels in 0..1, not 0..255: a byte value above 1 is
* clamped, so `SetColor(o,31,119,180)` silently paints the object white. Values are therefore
* scaled down and rounded to three decimals.
*/
function commandChannels(rgb) {
	return rgb.map((channel) => Math.round(channel / 255 * 1e3) / 1e3);
}
/** Validates one coordinate and reports which series/point failed. */
function readCoordinate(value, seriesIndex, pointIndex, axis) {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`series ${seriesIndex} point ${pointIndex} has a non-finite ${axis} coordinate (${typeof value === "number" ? String(value) : typeof value})`);
	return value;
}
/** Validates the whole input and returns the numeric series it describes. */
function validateSeries(series) {
	if (!Array.isArray(series) || series.length === 0) throw new Error("chart requires at least one series");
	return series.map((entry, offset) => {
		const index = offset + 1;
		if (entry === null || typeof entry !== "object") throw new Error(`series ${index} must be an object`);
		if (entry.style !== void 0 && !STYLES.includes(entry.style)) throw new Error(`series ${index} has unknown style "${String(entry.style)}"`);
		if (entry.fit !== void 0 && !FIT_MODELS.includes(entry.fit)) throw new Error(`series ${index} has unknown fit "${String(entry.fit)}"`);
		const points = entry.points;
		if (!Array.isArray(points)) throw new Error(`series ${index} must provide a points array`);
		if (points.length < 2) throw new Error(`series ${index} requires at least 2 points, got ${points.length}`);
		return points.map((point, pointOffset) => {
			const pointIndex = pointOffset + 1;
			if (!Array.isArray(point) || point.length !== 2) throw new Error(`series ${index} point ${pointIndex} must be a [x, y] pair`);
			const x = readCoordinate(point[0], index, pointIndex, "x");
			const y = readCoordinate(point[1], index, pointIndex, "y");
			if (entry.fit === "log" && x <= 0) throw new Error(`series ${index} point ${pointIndex} has x = ${formatNumber(x)}, but the "log" fit requires positive x values`);
			if ((entry.fit === "exp" || entry.fit === "pow") && y <= 0) throw new Error(`series ${index} point ${pointIndex} has y = ${formatNumber(y)}, but the "${entry.fit}" fit requires positive y values`);
			return [x, y];
		});
	});
}
/** Pads a data range by a fraction of its own span, then guarantees min < max. */
function paddedRange(minimum, maximum, margin) {
	const span = maximum - minimum;
	const padding = span > 0 ? span * margin : 0;
	let low = minimum - padding;
	let high = maximum + padding;
	if (!(high > low)) {
		const centre = (high + low) / 2;
		low = centre - DEGENERATE_HALF_SPAN;
		high = centre + DEGENERATE_HALF_SPAN;
	}
	return [low, high];
}
/**
* Turns numeric series into an ordered GeoGebra command list plus the viewport bounds.
*
* For series `i` (1-based) the commands create `L_i` (the data list), then `line_i` and/or `pts_i`
* according to the style, then `fit_i` when a fit is requested; styling commands follow last, and
* only when the series carries a `color` (an unparseable colour is ignored and GeoGebra's own
* colours are left alone). Nothing here sets the viewport - the caller applies the returned bounds.
*
* All four object families were verified against GeoGebra Classic 5.4.920.0: `L_i` is a `list`,
* `line_i` a `polyline`, `pts_i` a `list` that renders markers, and `fit_i` a `line` for `linear`
* but a `function` for every other model. GeoGebra creates `L_i` hidden, so `pts_i` is what draws
* the markers and no points are drawn twice.
*
* Minimum point counts per fit: linear/poly2 need 2, poly3 needs 3, poly4 needs 4, exp/pow need
* positive y, log needs positive x.
*
* @throws Error for an empty series list, a series with fewer than 2 points, a malformed point,
* a non-finite coordinate, an unknown style or fit, a margin outside 0..1, a negative
* captionSpace, and exp/pow/log domain violations.
*/
function buildChartCommands(input) {
	const series = input?.series;
	const margin = input?.margin ?? DEFAULT_MARGIN;
	const captionSpace = input?.captionSpace ?? 0;
	if (typeof margin !== "number" || !Number.isFinite(margin) || margin < 0 || margin > 1) throw new Error(`margin must be a number between 0 and 1, got ${String(margin)}`);
	if (typeof captionSpace !== "number" || !Number.isFinite(captionSpace) || captionSpace < 0) throw new Error(`captionSpace must be a non-negative number, got ${String(captionSpace)}`);
	const validated = validateSeries(series);
	const commands = [];
	const dataObjects = [];
	let xMin = Number.POSITIVE_INFINITY;
	let xMax = Number.NEGATIVE_INFINITY;
	let yMin = Number.POSITIVE_INFINITY;
	let yMax = Number.NEGATIVE_INFINITY;
	validated.forEach((points, offset) => {
		const index = offset + 1;
		const source = series[offset];
		if (source === void 0) return;
		const style = source.style ?? "line+points";
		const listName = `L_${index}`;
		const lineName = `line_${index}`;
		const pointsName = `pts_${index}`;
		const fitName = `fit_${index}`;
		const literals = points.map((point) => `(${formatNumber(point[0] ?? 0)},${formatNumber(point[1] ?? 0)})`);
		for (const point of points) {
			xMin = Math.min(xMin, point[0] ?? 0);
			xMax = Math.max(xMax, point[0] ?? 0);
			yMin = Math.min(yMin, point[1] ?? 0);
			yMax = Math.max(yMax, point[1] ?? 0);
		}
		commands.push(`${listName}={${literals.join(",")}}`);
		dataObjects.push(listName);
		const drawn = [listName];
		if (style === "line" || style === "line+points") {
			commands.push(`${lineName}=Polyline(${listName})`);
			dataObjects.push(lineName);
			drawn.push(lineName);
		}
		if (style === "points" || style === "line+points") {
			commands.push(`${pointsName}=Sequence(Element(${listName},k),k,1,Length(${listName}))`);
			dataObjects.push(pointsName);
			drawn.push(pointsName);
		}
		if (source.fit !== void 0) {
			commands.push(`${fitName}=${fitCommand(source.fit, listName)}`);
			dataObjects.push(fitName);
			drawn.push(fitName);
		}
		const rgb = source.color === void 0 ? null : parseHexColor(source.color);
		if (rgb !== null) {
			const [red, green, blue] = commandChannels(rgb);
			for (const name of drawn) commands.push(`SetColor(${name},${red},${green},${blue})`);
			if (drawn.includes(lineName)) commands.push(`SetLineThickness(${lineName},5)`);
			if (drawn.includes(pointsName)) commands.push(`SetPointSize(${pointsName},4)`);
		}
	});
	const [paddedXMin, paddedXMax] = paddedRange(xMin, xMax, margin);
	const [paddedYMin, paddedYMax] = paddedRange(yMin, yMax, margin);
	return {
		commands,
		xMin: paddedXMin,
		xMax: paddedXMax,
		yMin: paddedYMin - captionSpace,
		yMax: paddedYMax,
		dataObjects
	};
}
//#endregion
//#region src/index.ts
/** Host tools for stateless GeoGebra construction and export. */
const name = "geogebra-pic";
const inject = ["tools", "skills"];
const SKILL_URL = new URL("../skills/geogebra-pic/SKILL.md", import.meta.url);
const SKILL_CONTENT = readFileSync(SKILL_URL, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, "");
const FORMAT_SCHEMA = {
	type: "string",
	enum: [
		"png",
		"svg",
		"ggb"
	]
};
const OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		files: {
			type: "array",
			required: true,
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					path: {
						type: "string",
						required: true
					},
					format: {
						type: "string",
						required: true,
						enum: [
							"png",
							"svg",
							"ggb"
						]
					},
					bytes: {
						type: "integer",
						required: true
					}
				}
			}
		},
		objects: {
			type: "array",
			required: true,
			items: { type: "string" }
		},
		version: {
			type: "string",
			required: true
		},
		display: {
			type: "object",
			required: true,
			additionalProperties: false,
			properties: {
				width: {
					type: "integer",
					required: true
				},
				height: {
					type: "integer",
					required: true
				}
			}
		},
		view: {
			type: "object",
			required: true,
			additionalProperties: false,
			properties: {
				xMin: {
					type: "number",
					required: true
				},
				xMax: {
					type: "number",
					required: true
				},
				yMin: {
					type: "number",
					required: true
				},
				yMax: {
					type: "number",
					required: true
				}
			}
		},
		png: {
			type: "object",
			additionalProperties: false,
			properties: {
				width: {
					type: "integer",
					required: true
				},
				height: {
					type: "integer",
					required: true
				},
				dpi: {
					type: "integer",
					required: true
				}
			}
		},
		minFontPx: { type: "number" },
		minLegibleWidth: { type: "integer" },
		labelFontPx: {
			type: "integer",
			required: true
		},
		labelConflicts: { type: "integer" },
		labels: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					name: {
						type: "string",
						required: true
					},
					dx: {
						type: "number",
						required: true
					},
					dy: {
						type: "number",
						required: true
					},
					displaced: {
						type: "boolean",
						required: true
					},
					conflicts: {
						type: "integer",
						required: true
					},
					conflictsBefore: {
						type: "integer",
						required: true
					}
				}
			}
		}
	}
};
function sessionCwd(exec) {
	const cwd = exec.agent?.session.header.cwd;
	if (cwd === void 0) throw new Error("GeoGebra tools require a Session workspace");
	return cwd;
}
function safeWorkspacePath(cwd, authored) {
	if (authored.trim().length === 0) throw new Error("Path must not be empty");
	const target = resolve(cwd, authored);
	const fromWorkspace = relative(cwd, target);
	if (fromWorkspace.startsWith("..") || isAbsolute(fromWorkspace)) throw new Error("Path must stay inside the Session workspace");
	return target;
}
function safeBasename(value) {
	const basename = value?.trim() || "geogebra-drawing";
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(basename)) throw new Error("basename must be 1-80 filename-safe characters and start with a letter or number");
	return basename.replace(/\.(?:png|svg|ggb)$/iu, "");
}
function formats(values, defaults) {
	const selected = values === void 0 ? [...defaults] : [...new Set(values)];
	if (selected.length === 0) throw new Error("formats must contain at least one of png, svg, or ggb");
	return selected;
}
/**
* Figures are authored at their embedded display size, not at an oversized canvas. A figure that is
* drawn at 1200 px and then dropped into a document at 600 px halves every label.
*/
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const DEFAULT_PNG_SCALE = 1;
const DEFAULT_VIEW = {
	xMin: -10,
	xMax: 10,
	yMin: -7,
	yMax: 7
};
/** Distinct colours so a multi-series chart reads without the caller picking colours. */
const SERIES_PALETTE = [
	"#1f77b4",
	"#d62728",
	"#2ca02c",
	"#ff7f0e",
	"#9467bd",
	"#8c564b",
	"#17becf",
	"#bcbd22"
];
function dimensions(width, height) {
	const resolved = {
		width: width ?? DEFAULT_WIDTH,
		height: height ?? DEFAULT_HEIGHT
	};
	if (!Number.isInteger(resolved.width) || resolved.width < 320 || resolved.width > 2400 || !Number.isInteger(resolved.height) || resolved.height < 240 || resolved.height > 1800) throw new Error("width must be 320-2400 and height must be 240-1800");
	return resolved;
}
function view(args, fallback) {
	const value = {
		xMin: args.x_min ?? fallback.xMin,
		xMax: args.x_max ?? fallback.xMax,
		yMin: args.y_min ?? fallback.yMin,
		yMax: args.y_max ?? fallback.yMax
	};
	if (!(value.xMin < value.xMax && value.yMin < value.yMax)) throw new Error("Coordinate bounds must satisfy min < max");
	return value;
}
function pngScaleOf(value) {
	const scale = value ?? DEFAULT_PNG_SCALE;
	if (!Number.isFinite(scale) || scale < .5 || scale > 4) throw new Error("png_scale must be from 0.5 to 4");
	return scale;
}
function axisStepOf(value) {
	if (value === void 0) return void 0;
	if (!Number.isFinite(value) || value <= 0 || value > 1e3) throw new Error("axis_step must be a positive number up to 1000");
	return value;
}
function labelFontOf(value) {
	if (value === void 0) return void 0;
	if (!Number.isInteger(value) || value < 12 || value > 48) throw new Error(`label_font_px must be an integer from 12 to 48`);
	return value;
}
function placementOf(value) {
	if (value === void 0) return "smart";
	if (value !== "smart" && value !== "default" && value !== "off") throw new Error("label_placement must be one of smart, default, or off");
	return value;
}
function textOf(value, what) {
	if (value === void 0) return void 0;
	const text = value.trim();
	if (text.length === 0) throw new Error(`${what} must not be empty when given`);
	if (text.length > 400) throw new Error(`${what} must be at most 400 characters`);
	return text;
}
function axisAnnotations(x, y) {
	const labelX = textOf(x, "x_label");
	const labelY = textOf(y, "y_label");
	const labels = {};
	if (labelX !== void 0) labels.x = labelX;
	if (labelY !== void 0) labels.y = labelY;
	return Object.keys(labels).length === 0 ? void 0 : labels;
}
function unitAnnotations(x, y) {
	const unitX = textOf(x, "x_unit");
	const unitY = textOf(y, "y_unit");
	const units = {};
	if (unitX !== void 0) units.x = unitX;
	if (unitY !== void 0) units.y = unitY;
	return Object.keys(units).length === 0 ? void 0 : units;
}
/**
* Shared figure options for both tools. Axis tick numbers and the grid are off for embed sizes;
* labels are placed by the collision-aware engine unless the caller opts out.
*/
function figureOptions(args, fallback) {
	const axisStep = axisStepOf(args.axis_step);
	const axisLabels = axisAnnotations(args.x_label, args.y_label);
	const axisUnits = unitAnnotations(args.x_unit, args.y_unit);
	const labelFontPx = labelFontOf(args.label_font_px);
	const title = textOf(args.title, "title");
	const caption = textOf(args.caption, "caption");
	return {
		...dimensions(args.width, args.height),
		...view(args, fallback),
		pngScale: pngScaleOf(args.png_scale),
		transparent: args.transparent ?? false,
		axisNumbers: args.axis_numbers ?? false,
		grid: args.grid ?? false,
		labelPlacement: placementOf(args.label_placement),
		labelLeaders: args.label_leaders ?? true,
		...axisStep === void 0 ? {} : { axisStep },
		...axisLabels === void 0 ? {} : { axisLabels },
		...axisUnits === void 0 ? {} : { axisUnits },
		...labelFontPx === void 0 ? {} : { labelFontPx },
		...title === void 0 ? {} : { title: { text: title } },
		...caption === void 0 ? {} : { caption: { text: caption } }
	};
}
/**
* Turn chart series into commands plus bounds, reserving room for a title and caption so neither
* sits on the data. Colours default to a distinct palette so several series stay readable.
*/
function chartPlan(args) {
	const series = args.series ?? [];
	if (series.length === 0) throw new Error("series must contain at least one series object");
	const coloured = series.map((entry, index) => entry.color === void 0 ? {
		...entry,
		color: SERIES_PALETTE[index % SERIES_PALETTE.length] ?? "#1f77b4"
	} : entry);
	const caption = textOf(args.caption, "caption");
	const title = textOf(args.title, "title");
	const provisional = buildChartCommands({ series: coloured });
	const span = provisional.yMax - provisional.yMin;
	const captionSpace = caption === void 0 ? 0 : span * .12;
	const titleSpace = title === void 0 ? 0 : span * .06;
	const built = buildChartCommands({
		series: coloured,
		captionSpace
	});
	return {
		commands: built.commands,
		bounds: {
			xMin: built.xMin,
			xMax: built.xMax,
			yMin: built.yMin,
			yMax: built.yMax + titleSpace
		}
	};
}
async function saveOutputs(rendered, outputDir, basename, selected, bounds) {
	await mkdir(outputDir, { recursive: true });
	const files = [];
	for (const format of selected) {
		const output = rendered.outputs[format];
		if (output === void 0) throw new Error(`GeoGebra did not return ${format} output`);
		const path = join(outputDir, `${basename}.${format}`);
		const data = format === "svg" ? output : Buffer.from(output, "base64");
		await writeFile(path, data);
		files.push({
			path,
			format,
			bytes: typeof data === "string" ? Buffer.byteLength(data) : data.length
		});
	}
	const minFontPx = rendered.minFontPx;
	return {
		files,
		objects: [...rendered.objects],
		version: rendered.version,
		display: rendered.display,
		view: bounds,
		labelFontPx: rendered.labelFontPx,
		...rendered.png === void 0 ? {} : { png: rendered.png },
		...rendered.labelConflicts === void 0 ? {} : { labelConflicts: rendered.labelConflicts },
		...rendered.labels === void 0 ? {} : { labels: [...rendered.labels] },
		...minFontPx === void 0 ? {} : {
			minFontPx,
			minLegibleWidth: Math.floor(rendered.display.width * 12 / minFontPx)
		}
	};
}
function renderedText(value) {
	const lines = [
		`GeoGebra ${value.version} created ${value.objects.length} object(s): ${value.objects.join(", ") || "(none)"}`,
		`Display ${value.display.width} x ${value.display.height} px: author and embed at this width.`,
		`View x [${value.view.xMin}, ${value.view.xMax}], y [${value.view.yMin}, ${value.view.yMax}].`
	];
	if (value.minFontPx !== void 0 && value.minLegibleWidth !== void 0) lines.push(`Smallest text ${value.minFontPx} px: keep the embedded width at or above ${value.minLegibleWidth} px so text stays at least 12 px.`);
	lines.push(`Automatic labels and tick numbers render at ${value.labelFontPx} px.`);
	if (value.labels !== void 0 && value.labels.length > 0) {
		const moved = value.labels.filter((label) => label.dx !== 0 || label.dy !== 0);
		const displaced = value.labels.filter((label) => label.displaced);
		const before = value.labels.reduce((total, label) => total + label.conflictsBefore, 0);
		lines.push(`Label placement: ${value.labels.length} label(s) checked, ${moved.length} moved, ${displaced.length} with a leader line, ${before} -> ${value.labelConflicts ?? 0} obstacle conflicts.`);
		const crowded = moved.filter((label) => label.conflicts > 0);
		if (crowded.length > 0) lines.push(`Still touching geometry: ${crowded.map((label) => `${label.name}(${label.conflicts})`).join(", ")}. Widen the view or move nearby objects.`);
	}
	for (const file of value.files) {
		const detail = file.format === "png" && value.png !== void 0 ? `${value.png.width} x ${value.png.height} px @ ${value.png.dpi} dpi, ${file.bytes} bytes` : `${file.bytes} bytes`;
		lines.push(`${file.format.toUpperCase()}: ${file.path} (${detail})`);
	}
	return lines.join("\n");
}
const FIGURE_PARAMETERS = {
	width: {
		type: "integer",
		description: "Logical display width in CSS px from 320 to 2400; defaults to 800. This is the width the figure is authored for and embedded at, so 400-800 is the usual range for notes, documents, and slides."
	},
	height: {
		type: "integer",
		description: "Logical display height in CSS px from 240 to 1800; defaults to 600."
	},
	x_min: {
		type: "number",
		description: "Visible x-axis minimum. Omit to use the default -10, or the data range in series mode."
	},
	x_max: {
		type: "number",
		description: "Visible x-axis maximum. Omit to use the default 10, or the data range in series mode."
	},
	y_min: {
		type: "number",
		description: "Visible y-axis minimum. Omit to use the default -7, or the data range in series mode."
	},
	y_max: {
		type: "number",
		description: "Visible y-axis maximum. Omit to use the default 7, or the data range in series mode."
	},
	png_scale: {
		type: "number",
		description: "Raster multiplier from 0.5 to 4; defaults to 1. PNG pixels are width x scale while the embedded size stays the display size, because DPI metadata is written as 96 x scale. Use 2 only for HiDPI destinations."
	},
	transparent: {
		type: "boolean",
		description: "Use a transparent PNG background; defaults to false."
	},
	axis_numbers: {
		type: "boolean",
		description: "Show axis tick numbers; defaults to false because the default tick labels crowd a 400-800 px figure. Enable together with a coarser axis_step for chart figures."
	},
	axis_step: {
		type: "number",
		description: "Distance between axis ticks, for example 5 or 10. Use a coarser interval whenever axis_numbers is enabled."
	},
	grid: {
		type: "boolean",
		description: "Show the background grid; defaults to false for clean embedded figures."
	},
	x_label: {
		type: "string",
		description: "Label drawn at the end of the x-axis, using the physical-quantity convention such as \"t / s\" or \"x / m\". This is how units belong on a chart axis; prefer it over x_unit."
	},
	y_label: {
		type: "string",
		description: "Label drawn at the top of the y-axis, for example \"v / (m·s⁻¹)\" or \"F / N\"."
	},
	x_unit: {
		type: "string",
		description: "Per-tick unit suffix for the x-axis, for example \"s\". GeoGebra appends it to every tick number (\"2 s\"), so use x_label unless the figure really needs a unit on each tick."
	},
	y_unit: {
		type: "string",
		description: "Per-tick unit suffix for the y-axis; see x_unit."
	},
	label_font_px: {
		type: "integer",
		description: `Font size in px for automatic object labels and axis tick numbers, 12-48; GeoGebra snaps it to its own ladder and the effective size is reported back. Defaults to GeoGebra's 16 px.`
	},
	label_placement: {
		type: "string",
		enum: [
			"smart",
			"default",
			"off"
		],
		description: "smart (default) measures every automatic label and moves it clear of curves, axes, other labels, and the frame, drawing a thin leader line when a label has to move far; default keeps GeoGebra's own placement; off hides automatic labels entirely so the figure can use authored Text labels."
	},
	label_leaders: {
		type: "boolean",
		description: "Draw a thin leader line for a label that the engine had to move away from its object; defaults to true. Set false for a cleaner look when labels stay close."
	},
	title: {
		type: "string",
		description: "Figure title, created, centred, and sized by the renderer at 24 px."
	},
	caption: {
		type: "string",
		description: "Figure caption, created, centred, and sized by the renderer at 16 px below the axes. In series mode the view reserves a band under the data so the caption never sits on it."
	}
};
const SERIES_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		name: { type: "string" },
		points: {
			type: "array",
			required: true,
			items: {
				type: "array",
				items: { type: "number" }
			}
		},
		style: {
			type: "string",
			enum: [
				"line",
				"points",
				"line+points"
			]
		},
		color: { type: "string" },
		fit: {
			type: "string",
			enum: [
				"linear",
				"poly2",
				"poly3",
				"poly4",
				"exp",
				"log",
				"pow",
				"sin"
			]
		}
	}
};
function apply(ctx) {
	ctx.skills.register({
		name: "geogebra-pic",
		description: "Use GeoGebra commands to create mathematical constructions and export PNG, SVG, or editable GGB files. Use for functions, geometry, conics, loci, line charts, fitted curves, and dynamic constructions, including axis labels with units and figure captions.",
		whenToUse: "When the user asks to draw, construct, verify, or export a mathematical figure or chart with GeoGebra.",
		source: "bundled",
		path: fileURLToPath(SKILL_URL),
		resourceBase: {
			kind: "directory",
			path: fileURLToPath(new URL("../skills/geogebra-pic/", import.meta.url))
		},
		content: SKILL_CONTENT
	});
	ctx.tools.register(defineTool({
		name: "geogebra_draw",
		description: "Create a GeoGebra construction from GeoGebra commands, or from numeric chart series, and export PNG, SVG, and/or an editable .ggb file. Use this for function plots, Euclidean geometry, conics, analytic geometry, sliders, loci, line charts, scatter plots, fitted curves, and publication-ready mathematical figures. Outputs are written inside the current Session workspace. Commands execute in one construction and may reference objects created by earlier commands. The figure is authored at its embedded display size (default 800 x 600 px), so width is the size it is meant to be shown at; PNG DPI metadata matches the raster multiplier so documents insert it at that size. Axis tick numbers and the background grid are off by default because they crowd a 400-800 px figure; give a chart an axis_label with the quantity and unit (for example \"t / s\") rather than a unit suffix on every tick. Automatic point/segment labels are placed by a collision-aware engine by default, so they avoid curves, axes, and each other. For every visible Text object, include the plugin directive SetFontSize(label, pixels) with an explicit 12-48 px size; it is applied through the GeoGebra Apps API and persisted in every export.",
		parameters: {
			commands: {
				type: "array",
				items: { type: "string" },
				description: "Ordered GeoGebra commands, for example [\"F_1=(-3,0)\", \"F_2=(3,0)\", \"c=Ellipse(F_1,F_2,5)\"]. Provide either commands or series, not both."
			},
			series: {
				type: "array",
				items: SERIES_SCHEMA,
				description: "Numeric chart series instead of commands: each entry is { points: [[x,y],...], style?: \"line\"|\"points\"|\"line+points\", color?: \"#rrggbb\", fit?: \"linear\"|\"poly2\"|\"poly3\"|\"poly4\"|\"exp\"|\"log\"|\"pow\"|\"sin\" }. Objects are named L_i, line_i, pts_i, fit_i; the view bounds come from the data unless x_min/x_max/y_min/y_max are given. Provide either series or commands, not both."
			},
			basename: {
				type: "string",
				description: "Output filename without extension; defaults to geogebra-drawing."
			},
			output_dir: {
				type: "string",
				description: "Workspace-relative output directory; defaults to the workspace root."
			},
			formats: {
				type: "array",
				items: FORMAT_SCHEMA,
				description: "Any of png, svg, ggb; defaults to all three."
			},
			...FIGURE_PARAMETERS,
			chrome_path: {
				type: "string",
				description: "Optional Chrome/Chromium/Edge executable path when automatic discovery fails."
			}
		},
		output: {
			schema: OUTPUT_SCHEMA,
			render: (_args, value) => [{
				type: "text",
				text: renderedText(value)
			}]
		},
		timeoutMs: 12e4,
		async execute(args, exec) {
			const outputDir = safeWorkspacePath(sessionCwd(exec), args.output_dir?.trim() || ".");
			const selected = formats(args.formats, [
				"png",
				"svg",
				"ggb"
			]);
			const chart = args.series === void 0 ? void 0 : chartPlan(args);
			if (chart === void 0 && args.commands === void 0) throw new Error("Provide either commands or series");
			if (chart !== void 0 && args.commands !== void 0) throw new Error("Provide either commands or series, not both");
			const commands = chart?.commands ?? args.commands ?? [];
			if (commands.length === 0 || commands.some((command) => command.trim().length === 0)) throw new Error("commands must contain at least one non-empty command");
			const options = figureOptions(args, chart?.bounds ?? DEFAULT_VIEW);
			return saveOutputs(await renderGeoGebra({
				commands,
				formats: selected,
				...options,
				signal: exec.signal,
				...args.chrome_path?.trim() ? { chromePath: args.chrome_path.trim() } : {}
			}), outputDir, safeBasename(args.basename), selected, {
				xMin: options.xMin,
				xMax: options.xMax,
				yMin: options.yMin,
				yMax: options.yMax
			});
		},
		presentCall: (args) => ({
			card: "generic",
			title: args.series === void 0 ? "Draw with GeoGebra" : "Draw chart with GeoGebra",
			kind: "other",
			rawInput: args
		})
	}));
	ctx.tools.register(defineTool({
		name: "geogebra_export",
		description: "Open an existing editable .ggb construction from the current Session workspace and export it to PNG, SVG, and/or another .ggb file. Use geogebra_draw when starting from commands. Axis labels, label font size, and collision-aware label placement can be applied while exporting.",
		parameters: {
			input_file: {
				type: "string",
				required: true,
				description: "Workspace-relative path to an existing .ggb file."
			},
			basename: {
				type: "string",
				description: "Output filename without extension; defaults to the input filename."
			},
			output_dir: {
				type: "string",
				description: "Workspace-relative output directory; defaults to the input file directory."
			},
			formats: {
				type: "array",
				items: FORMAT_SCHEMA,
				description: "Any of png, svg, ggb; defaults to png and svg."
			},
			...FIGURE_PARAMETERS,
			chrome_path: {
				type: "string",
				description: "Optional Chrome/Chromium/Edge executable path."
			}
		},
		output: {
			schema: OUTPUT_SCHEMA,
			render: (_args, value) => [{
				type: "text",
				text: renderedText(value)
			}]
		},
		timeoutMs: 12e4,
		async execute(args, exec) {
			const cwd = sessionCwd(exec);
			const inputPath = safeWorkspacePath(cwd, args.input_file);
			if (!inputPath.toLowerCase().endsWith(".ggb")) throw new Error("input_file must end with .ggb");
			const input = await readFile(inputPath);
			const inputName = args.input_file.replaceAll("\\", "/").split("/").at(-1)?.replace(/\.ggb$/iu, "");
			const defaultDir = args.input_file.replaceAll("\\", "/").split("/").slice(0, -1).join("/") || ".";
			const outputDir = safeWorkspacePath(cwd, args.output_dir?.trim() || defaultDir);
			const selected = formats(args.formats, ["png", "svg"]);
			const options = figureOptions(args, DEFAULT_VIEW);
			return saveOutputs(await renderGeoGebra({
				ggbBase64: input.toString("base64"),
				formats: selected,
				...options,
				signal: exec.signal,
				...args.chrome_path?.trim() ? { chromePath: args.chrome_path.trim() } : {}
			}), outputDir, safeBasename(args.basename ?? inputName), selected, {
				xMin: options.xMin,
				xMax: options.xMax,
				yMin: options.yMin,
				yMax: options.yMax
			});
		},
		presentCall: (args) => ({
			card: "generic",
			title: "Export GeoGebra construction",
			kind: "read",
			rawInput: args
		})
	}));
}
//#endregion
export { apply, inject, name };
