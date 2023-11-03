# 对于 OpenType Feature 的支持情况

｜2023 年 11 月 02 日｜

为了检测 cn-font-split 和最先进的浏览器对于各种 Opentype Feature 的支持程度，我们对非常多款字体进行了相应的视觉测试，保证其实现的严谨性。

下表来源为 [Registered Features](https://learn.microsoft.com/en-us/typography/opentype/spec/featurelist)，我们用于记录测试进度。

> 状态解释
>
> 1. ✅ 支持，并通过测试
> 2. ❌ 未进行测试，可能不支持
> 3. ⏺️ 部分支持，待验证

| Status | Feature Tag                                                                                         | Friendly Name                                  |
| ------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| ✅     | ['aalt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#aalt)               | Access All Alternates                          |
| ❌     | ['abvf'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#abvf)               | Above-base Forms                               |
| ❌     | ['abvm'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#abvm)               | Above-base Mark Positioning                    |
| ❌     | ['abvs'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#abvs)               | Above-base Substitutions                       |
| ✅     | ['afrc'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#afrc)               | Alternative Fractions                          |
| ❌     | ['akhn'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#akhn)               | Akhand                                         |
| ❌     | ['blwf'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#blwf)               | Below-base Forms                               |
| ❌     | ['blwm'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#blwm)               | Below-base Mark Positioning                    |
| ❌     | ['blws'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#blws)               | Below-base Substitutions                       |
| ✅     | ['calt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#calt)               | Contextual Alternates                          |
| ✅     | ['case'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#case)               | Case-Sensitive Forms                           |
| ❌     | ['ccmp'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#ccmp)               | Glyph Composition / Decomposition              |
| ❌     | ['cfar'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#cfar)               | Conjunct Form After Ro                         |
| ❌     | ['chws'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#chws)               | Contextual Half-width Spacing                  |
| ❌     | ['cjct'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#cjct)               | Conjunct Forms                                 |
| ❌     | ['clig'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#clig)               | Contextual Ligatures                           |
| ❌     | ['cpct'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#cpct)               | Centered CJK Punctuation                       |
| ✅     | ['cpsp'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#cpsp)               | Capital Spacing                                |
| ✅     | ['cswh'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#cswh)               | Contextual Swash                               |
| ❌     | ['curs'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#curs)               | Cursive Positioning                            |
| ❌     | ['cv01' – 'cv99'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#cv01-cv99) | Character Variants                             |
| ✅     | ['c2pc'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#c2pc)               | Petite Capitals From Capitals                  |
| ✅     | ['c2sc'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#c2sc)               | Small Capitals From Capitals                   |
| ❌     | ['dist'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#dist)               | Distances                                      |
| ✅     | ['dlig'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#dlig)               | Discretionary Ligatures                        |
| ✅     | ['dnom'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#dnom)               | Denominators                                   |
| ❌     | ['dtls'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#dtls)               | Dotless Forms                                  |
| ✅     | ['expt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ae#expt)               | Expert Forms                                   |
| ❌     | ['falt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#falt)               | Final Glyph on Line Alternates                 |
| ❌     | ['fin2'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#fin2)               | Terminal Forms #2                              |
| ❌     | ['fin3'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#fin3)               | Terminal Forms #3                              |
| ✅     | ['fina'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#fina)               | Terminal Forms                                 |
| ❌     | ['flac'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#flac)               | Flattened accent forms                         |
| ✅     | ['frac'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#frac)               | Fractions                                      |
| ✅     | ['fwid'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#fwid)               | Full Widths                                    |
| ❌     | ['half'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#half)               | Half Forms                                     |
| ❌     | ['haln'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#haln)               | Halant Forms                                   |
| ✅     | ['halt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#halt)               | Alternate Half Widths                          |
| ✅     | ['hist'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#hist)               | Historical Forms                               |
| ❌     | ['hkna'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#hkna)               | Horizontal Kana Alternates                     |
| ✅     | ['hlig'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#hlig)               | Historical Ligatures                           |
| ❌     | ['hngl'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#hngl)               | Hangul                                         |
| ❌     | ['hojo'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#hojo)               | Hojo Kanji Forms (JIS X 0212-1990 Kanji Forms) |
| ✅     | ['hwid'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#hwid)               | Half Widths                                    |
| ✅     | ['init'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#init)               | Initial Forms                                  |
| ❌     | ['isol'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#isol)               | Isolated Forms                                 |
| ❌     | ['ital'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#ital)               | Italics                                        |
| ❌     | ['jalt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#jalt)               | Justification Alternates                       |
| ❌     | ['jp78'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#jp78)               | JIS78 Forms                                    |
| ❌     | ['jp83'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#jp83)               | JIS83 Forms                                    |
| ❌     | ['jp90'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#jp90)               | JIS90 Forms                                    |
| ❌     | ['jp04'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_fj#jp04)               | JIS2004 Forms                                  |
| ✅     | ['kern'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#kern)               | Kerning                                        |
| ❌     | ['lfbd'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#lfbd)               | Left Bounds                                    |
| ✅     | ['liga'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#liga)               | Standard Ligatures                             |
| ❌     | ['ljmo'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#ljmo)               | Leading Jamo Forms                             |
| ❌     | ['lnum'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#lnum)               | Lining Figures                                 |
| ✅     | ['locl'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#locl)               | Localized Forms                                |
| ❌     | ['ltra'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#ltra)               | Left-to-right alternates                       |
| ❌     | ['ltrm'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#ltrm)               | Left-to-right mirrored forms                   |
| ❌     | ['mark'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#mark)               | Mark Positioning                               |
| ❌     | ['med2'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#med2)               | Medial Forms #2                                |
| ✅     | ['medi'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#medi)               | Medial Forms                                   |
| ✅     | ['mgrk'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#mgrk)               | Mathematical Greek                             |
| ❌     | ['mkmk'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#mkmk)               | Mark to Mark Positioning                       |
| ❌     | ['mset'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#mset)               | Mark Positioning via Substitution              |
| ❌     | ['nalt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#nalt)               | Alternate Annotation Forms                     |
| ❌     | ['nlck'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#nlck)               | NLC Kanji Forms                                |
| ❌     | ['nukt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#nukt)               | Nukta Forms                                    |
| ✅     | ['numr'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#numr)               | Numerators                                     |
| ✅     | ['onum'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#onum)               | Oldstyle Figures                               |
| ❌     | ['opbd'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#opbd)               | Optical Bounds                                 |
| ❌     | ['ordn'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#ordn)               | Ordinals                                       |
| ✅     | ['ornm'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_ko#ornm)               | Ornaments                                      |
| ✅     | ['palt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#palt)               | Proportional Alternate Widths                  |
| ✅     | ['pcap'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#pcap)               | Petite Capitals                                |
| ❌     | ['pkna'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#pkna)               | Proportional Kana                              |
| ✅     | ['pnum'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#pnum)               | Proportional Figures                           |
| ❌     | ['pref'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#pref)               | Pre-Base Forms                                 |
| ❌     | ['pres'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#pres)               | Pre-base Substitutions                         |
| ❌     | ['pstf'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#pstf)               | Post-base Forms                                |
| ❌     | ['psts'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#psts)               | Post-base Substitutions                        |
| ✅     | ['pwid'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#pwid)               | Proportional Widths                            |
| ❌     | ['qwid'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#qwid)               | Quarter Widths                                 |
| ✅     | ['rand'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rand)               | Randomize                                      |
| ❌     | ['rclt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rclt)               | Required Contextual Alternates                 |
| ❌     | ['rkrf'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rkrf)               | Rakar Forms                                    |
| ✅     | ['rlig'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rlig)               | Required Ligatures                             |
| ❌     | ['rphf'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rphf)               | Reph Forms                                     |
| ❌     | ['rtbd'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rtbd)               | Right Bounds                                   |
| ❌     | ['rtla'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rtla)               | Right-to-left alternates                       |
| ❌     | ['rtlm'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rtlm)               | Right-to-left mirrored forms                   |
| ❌     | ['ruby'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ruby)               | Ruby Notation Forms                            |
| ❌     | ['rvrn'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#rvrn)               | Required Variation Alternates                  |
| ✅     | ['salt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#salt)               | Stylistic Alternates                           |
| ✅     | ['sinf'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#sinf)               | Scientific Inferiors                           |
| ❌     | ['size'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#size)               | Optical size                                   |
| ✅     | ['smcp'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#smcp)               | Small Capitals                                 |
| ❌     | ['smpl'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#smpl)               | Simplified Forms                               |
| ✅     | ['ss01'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 1                                |
| ❌     | ['ss02'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 2                                |
| ❌     | ['ss03'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 3                                |
| ❌     | ['ss04'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 4                                |
| ❌     | ['ss05'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 5                                |
| ❌     | ['ss06'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 6                                |
| ❌     | ['ss07'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 7                                |
| ❌     | ['ss08'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 8                                |
| ❌     | ['ss09'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 9                                |
| ❌     | ['ss10'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 10                               |
| ❌     | ['ss11'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 11                               |
| ❌     | ['ss12'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 12                               |
| ❌     | ['ss13'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 13                               |
| ❌     | ['ss14'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 14                               |
| ❌     | ['ss15'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 15                               |
| ❌     | ['ss16'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 16                               |
| ❌     | ['ss17'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 17                               |
| ❌     | ['ss18'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 18                               |
| ❌     | ['ss19'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 19                               |
| ❌     | ['ss20'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssxx)               | Stylistic Set 20                               |
| ❌     | ['ssty'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#ssty)               | Math script style alternates                   |
| ❌     | ['stch'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#stch)               | Stretching Glyph Decomposition                 |
| ✅     | ['subs'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#subs)               | Subscript                                      |
| ✅     | ['sups'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#sups)               | Superscript                                    |
| ✅     | ['swsh'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#swsh)               | Swash                                          |
| ✅     | ['titl'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#titl)               | Titling                                        |
| ❌     | ['tjmo'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#tjmo)               | Trailing Jamo Forms                            |
| ❌     | ['tnam'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#tnam)               | Traditional Name Forms                         |
| ❌     | ['tnum'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#tnum)               | Tabular Figures                                |
| ❌     | ['trad'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#trad)               | Traditional Forms                              |
| ❌     | ['twid'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_pt#twid)               | Third Widths                                   |
| ✅     | ['unic'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#unic)               | Unicase                                        |
| ❌     | ['valt'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#valt)               | Alternate Vertical Metrics                     |
| ❌     | ['vatu'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vatu)               | Vattu Variants                                 |
| ❌     | ['vchw'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vchw)               | Vertical Contextual Half-width Spacing         |
| ❌     | ['vert'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vert)               | Vertical Writing                               |
| ❌     | ['vhal'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vhal)               | Alternate Vertical Half Metrics                |
| ❌     | ['vjmo'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vjmo)               | Vowel Jamo Forms                               |
| ✅     | ['vkna'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vkna)               | Vertical Kana Alternates                       |
| ❌     | ['vkrn'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vkrn)               | Vertical Kerning                               |
| ✅     | ['vpal'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vpal)               | Proportional Alternate Vertical Metrics        |
| ❌     | ['vrt2'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vrt2)               | Vertical Alternates and Rotation               |
| ❌     | ['vrtr'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#vrtr)               | Vertical Alternates for Rotation               |
| ✅     | ['zero'](https://learn.microsoft.com/zh-cn/typography/opentype/spec/features_uz#zero)               | Slashed Zero                                   |
