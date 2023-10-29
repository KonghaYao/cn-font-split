# 预分包算法概述

由于预分包算法涉及非常多复杂的集合运算，所以我把这个逻辑写出来，方便维护。预分包算法对应 PreSubsets 模块。

cn-font-split 的预分包算法是一种组合算法，其中包括了强制分包算法和自动分包算法两大部分以及一些修补类的算法。

## 算法流程

### 强制分包流程

1. 用户输入自定义的 UserSubsets，默认为 []
2. 生成统一 AllUnicodeSet（字体包内所有的 unicode）
    1. 这个 Set 在后面流程中，分包 unicode 时，抽离该 unicode，保证唯一性
3. AllUnicodeSet - UserSubsets
4. LanguageFirstSubsets（默认语言强制分包）=filter=> in AllUnicodeSet, AllUnicodeSet remove
    1. 默认语言强制分包用于隔离拉丁字符以增强单语言效率
    2. 用于中文使用率排序，保证单包字符间的粘合性
5. UserSubsets 进行 feature 装饰
6. AllUnicodeSet - ForcePartSubsets

### 自动分包流程

8. 计算单包轮廓最大值和字符最大值
9. AllUnicodeSet 进行遍历分包
    1. 当达到 7 中的条件两个中的其中一个最大值时，分包结束，开始下一个分包

### 修复算法流程

10. 使用特殊的算法计算分包中的单包字符数离群值,将小值分包进行合并，防止出现分包碎片
    1. 暂时只关注离群的小值，对大值进行告警
11. 校验分包数目与字体一致
