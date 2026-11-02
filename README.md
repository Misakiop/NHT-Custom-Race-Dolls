# Nice Health Tab - Custom Race Dolls

为不同种族换上专属的**发型与身体部位**，也能在娃娃上额外添加翅膀、尾巴、角、头饰等**装饰**。  
本质是 [Nice Health Tab](https://steamcommunity.com/sharedfiles/filedetails/?id=3328729902)（一个非常美观的健康页面模组）的种族补丁集。

## 目前内置

| 种族 | 身体 | 备注 |
| --- | --- | --- |
| Milira race |
| Miho race |
| Kiiro race |
| Ratkin race | 
| Wolfein race |

…还在陆续调整与补充。

## 功能

- **种族专属娃娃**：按种族自动替换 NHT 面板里的身体，互相独立、互不影响；
- **自定义部位与装饰**：种族自带部位（翅膀 / 尾巴 / 角）直接绑定它自己的序号，
  人类共有部位沿用 0–63，编辑器会按对照表自动换算；
- **64 号以后的部位**（如尾巴）同样支持，受伤信息与悬停提示正常；
- **HAR 发型绘制**：头发按「层级」插入到部位之间，耳朵、角这类层级更高的部位
  可以自然盖在头发之上；
- **非 HAR 发型上色**：原版 HairDef 种族（RatKin 等）可开启「发型重绘」补发色；
- **体型 / 性别可细分**：默认全部使用该种族补丁，也可以在 Mod 设置里按
  默认 / 男 / 女 / 指定体型单独挑娃娃，或改用 NHT 自带的原版体型。

## 目录

```
About/                 版本与依赖声明（含图标）
Assemblies/            模组 DLL
Defs/                  默认发型参数等
Patches/nht-*.xml      编辑器注入的种族娃娃补丁
Textures/              编辑器推送的贴图
Languages/             中英文文本
Editor/                网页编辑器（anatomy-editor.html + 本地服务脚本）
Source/                C# 源码 + build.ps1
```

## 配套编辑器

仓库自带网页编辑器：双击 `Editor\启动编辑器.bat`，会开一个控制台窗口（= 本地服务）并自动打开浏览器。

流程：**导入种族 → 调部位 / 发型 → 导出页注入模组**。

编辑器能自行处理大多数问题（部位编号对照、发型参数、缺贴图提示等），
但功能较多、界面稍显繁琐，第一次用建议先看编辑器里的「指南」。
不想动手也可以在评论区留言需要的种族，我看到后会排进清单。

## 前置与兼容

- 需要 **Harmony**、**Nice Health Tab**；
- 与 **HAR**（Humanoid Alien Races）一起使用时，请让它排在本模组之前加载；

## 版本

- 目前在 **1.7** 环境下测试通过；

## 重新编译 DLL

```powershell
powershell -ExecutionPolicy Bypass -File Source\build.ps1
```

然后完全退出游戏，双击 `Editor\安装新DLL.bat`（游戏运行时 DLL 被占用会写入失败）。

## 授权

补丁与贴图版权归原作者；本仓库只放娃娃数据与绘制逻辑。如作者有异议请联系我移除。
