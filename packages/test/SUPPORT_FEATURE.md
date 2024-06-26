# 对于 OpenType Feature 的支持情况

｜2023 年 11 月 02 日｜

为了检测 cn-font-split 和最先进的浏览器对于各种 Opentype Feature 的支持程度，我们对非常多款字体进行了相应的视觉测试，保证其实现的严谨性。

下表来源为 [Registered Features](https://learn.microsoft.com/en-us/typography/opentype/spec/featurelist)，我们用于记录测试进度。

我们的测试浏览器核心为 Webkit。它对 OpenType 的支持是最为全面和可靠的，Chromium 和 FireFox 都在不同程度上对字体排版的渲染进行了一些自定义的变更导致测试失败。

> 状态解释
>
> 1. ✅ 支持，并通过测试
> 2. ❌ 未进行测试，可能不支持
> 3. ⏺️ 部分支持，待验证
> 4. ⭕ 浏览器不支持

| Status | Feature Tag | Friendly Name                                       | 测试说明                                                      |
| ------ | ----------- | --------------------------------------------------- | ------------------------------------------------------------- |
| ✅     | aalt        | Access All Alternates                               |                                                               |
| ✅     | abvf        | Above-base Forms                                    |                                                               |
| ✅     | abvm        | Above-base Mark Positioning                         |                                                               |
| ✅     | abvs        | Above-base Substitutions                            |                                                               |
| ✅     | afrc        | Alternative Fractions                               |                                                               |
| ✅     | akhn        | Akhand                                              |                                                               |
| ⏺️     | blwf        | Below-base Forms                                    | harfbuzz 部分解析失效，部分成功                               |
| ✅     | blwm        | Below-base Mark Positioning                         |                                                               |
| ✅     | blws        | Below-base Substitutions                            |                                                               |
| ✅     | calt        | Contextual Alternates                               |                                                               |
| ✅     | case        | Case-Sensitive Forms                                |                                                               |
| ✅     | ccmp        | Glyph Composition / Decomposition                   |                                                               |
| ❌     | cfar        | Conjunct Form After Ro                              |                                                               |
| ❌     | chws        | Contextual Half-width Spacing                       |                                                               |
| ✅     | cjct        | Conjunct Forms                                      |                                                               |
| ✅     | clig        | Contextual Ligatures                                |                                                               |
| ⏺️     | cpct        | Centered CJK Punctuation                            | 浏览器 unicode-range 部分形态位移                             |
| ✅     | cpsp        | Capital Spacing                                     |                                                               |
| ✅     | cswh        | Contextual Swash                                    |                                                               |
| ✅     | curs        | Cursive Positioning                                 |                                                               |
| ✅     | cv01 –cv99  | Character Variants                                  |                                                               |
| ✅     | c2pc        | Petite Capitals From Capitals                       |                                                               |
| ✅     | c2sc        | Small Capitals From Capitals                        |                                                               |
| ✅     | dist        | Distances                                           |                                                               |
| ✅     | dlig        | Discretionary Ligatures                             |                                                               |
| ✅     | dnom        | Denominators                                        |                                                               |
| ⏺️     | dtls        | Dotless Forms                                       | 数学符号的支持不好                                            |
| ✅     | expt        | Expert Forms                                        |                                                               |
| ❌     | falt        | Final Glyph on Line Alternates **deprecated**       |                                                               |
| ✅     | fin2        | Terminal Forms #2                                   |                                                               |
| ✅     | fin3        | Terminal Forms #3                                   |                                                               |
| ✅     | fina        | Terminal Forms                                      |                                                               |
| ❌     | flac        | Flattened accent forms                              |                                                               |
| ✅     | frac        | Fractions                                           |                                                               |
| ✅     | fwid        | Full Widths                                         |                                                               |
| ✅     | half        | Half Forms                                          |                                                               |
| ✅     | haln        | Halant Forms                                        |                                                               |
| ✅     | halt        | Alternate Half Widths                               |                                                               |
| ✅     | hist        | Historical Forms                                    |                                                               |
| ✅     | hkna        | Horizontal Kana Alternates                          |                                                               |
| ✅     | hlig        | Historical Ligatures                                |                                                               |
| ❌     | hngl        | Hangul **deprecated**                               |                                                               |
| ✅     | hojo        | Hojo Kanji Forms <br/>(JIS X 0212-1990 Kanji Forms) |                                                               |
| ✅     | hwid        | Half Widths                                         |                                                               |
| ✅     | init        | Initial Forms                                       |                                                               |
| ✅     | isol        | Isolated Forms                                      |                                                               |
| ✅     | ital        | Italics                                             |                                                               |
| ✅     | jalt        | Justification Alternates                            |                                                               |
| ✅     | jp78        | JIS78 Forms                                         |                                                               |
| ✅     | jp83        | JIS83 Forms                                         |                                                               |
| ✅     | jp90        | JIS90 Forms                                         |                                                               |
| ✅     | jp04        | JIS2004 Forms                                       |                                                               |
| ✅     | kern        | Kerning                                             |                                                               |
| ❌     | lfbd        | Left Bounds                                         |                                                               |
| ✅     | liga        | Standard Ligatures                                  |                                                               |
| ✅     | ljmo        | Leading Jamo Forms                                  |                                                               |
| ✅     | lnum        | Lining Figures                                      |                                                               |
| ✅     | locl        | Localized Forms                                     |                                                               |
| ❌     | ltra        | Left-to-right alternates                            |                                                               |
| ❌     | ltrm        | Left-to-right mirrored forms                        |                                                               |
| ⏺️     | mark        | Mark Positioning                                    |                                                               |
| ✅     | med2        | Medial Forms #2                                     |                                                               |
| ✅     | medi        | Medial Forms                                        |                                                               |
| ✅     | mgrk        | Mathematical Greek                                  |                                                               |
| ✅     | mkmk        | Mark to Mark Positioning                            |                                                               |
| ❌     | mset        | Mark Positioning via Substitution                   |                                                               |
| ✅     | nalt        | Alternate Annotation Forms                          |                                                               |
| ✅     | nlck        | NLC Kanji Forms                                     |                                                               |
| ✅     | nukt        | Nukta Forms                                         |                                                               |
| ✅     | numr        | Numerators                                          |                                                               |
| ✅     | onum        | Oldstyle Figures                                    |                                                               |
| ❌     | opbd        | Optical Bounds                                      |                                                               |
| ✅     | ordn        | Ordinals                                            |                                                               |
| ✅     | ornm        | Ornaments                                           |                                                               |
| ✅     | palt        | Proportional Alternate Widths                       |                                                               |
| ✅     | pcap        | Petite Capitals                                     |                                                               |
| ✅     | pkna        | Proportional Kana                                   |                                                               |
| ✅     | pnum        | Proportional Figures                                |                                                               |
| ✅     | pref        | Pre-Base Forms                                      |                                                               |
| ✅     | pres        | Pre-base Substitutions                              |                                                               |
| ✅     | pstf        | Post-base Forms                                     |                                                               |
| ✅     | psts        | Post-base Substitutions                             |                                                               |
| ✅     | pwid        | Proportional Widths                                 |                                                               |
| ✅     | qwid        | Quarter Widths                                      |                                                               |
| ✅     | rand        | Randomize                                           |                                                               |
| ✅     | rclt        | Required Contextual Alternates                      |                                                               |
| ✅     | rkrf        | Rakar Forms                                         |                                                               |
| ✅     | rlig        | Required Ligatures                                  |                                                               |
| ✅     | rphf        | Reph Forms                                          |                                                               |
| ❌     | rtbd        | Right Bounds                                        |                                                               |
| ✅     | rtla        | Right-to-left alternates                            |                                                               |
| ✅     | rtlm        | Right-to-left mirrored forms                        |                                                               |
| ✅     | ruby        | Ruby Notation Forms                                 |                                                               |
| ❌     | rvrn        | Required Variation Alternates                       |                                                               |
| ✅     | salt        | Stylistic Alternates                                |                                                               |
| ✅     | sinf        | Scientific Inferiors                                |                                                               |
| ❌     | size        | Optical size **deprecated**                         |                                                               |
| ✅     | smcp        | Small Capitals                                      |                                                               |
| ✅     | smpl        | Simplified Forms                                    |                                                               |
| ✅     | ss01 -ss20  | Stylistic Set                                       |                                                               |
| ⏺️     | ssty        | Math script style alternates                        | 数学的支持度不好                                              |
| ❌     | stch        | Stretching Glyph Decomposition                      |                                                               |
| ✅     | subs        | Subscript                                           |                                                               |
| ✅     | sups        | Superscript                                         |                                                               |
| ✅     | swsh        | Swash                                               |                                                               |
| ✅     | titl        | Titling                                             |                                                               |
| ✅     | tjmo        | Trailing Jamo Forms                                 |                                                               |
| ❌     | tnam        | Traditional Name Forms                              |                                                               |
| ✅     | tnum        | Tabular Figures                                     |                                                               |
| ✅     | trad        | Traditional Forms                                   |                                                               |
| ✅     | twid        | Third Widths                                        |                                                               |
| ✅     | unic        | Unicase                                             |                                                               |
| ❌     | valt        | Alternate Vertical Metrics                          |                                                               |
| ⏺️     | vatu        | Vattu Variants                                      | vatu 貌似在浏览器上实现不了，但是其字符可以通过另外的方式获得 |
| ❌     | vchw        | Vertical Contextual Half-width Spacing              |                                                               |
| ⏺️     | vert        | Vertical Writing                                    | 浏览器 unicode-range 部分形态位移                             |
| ⏺️     | vhal        | Alternate Vertical Half Metrics                     | 浏览器 unicode-range 部分形态位移                             |
| ✅     | vjmo        | Vowel Jamo Forms                                    |                                                               |
| ⏺️     | vkna        | Vertical Kana Alternates                            |                                                               |
| ✅     | vkrn        | Vertical Kerning                                    |                                                               |
| ✅     | vpal        | Proportional Alternate Vertical Metrics             |                                                               |
| ✅     | vrt2        | Vertical Alternates and Rotation                    |                                                               |
| ❌     | vrtr        | Vertical Alternates for Rotation                    |                                                               |
| ✅     | zero        | Slashed Zero                                        |                                                               |
