// ============================================================
// i18n Translations for Hypoid Gear Visualization
// ============================================================

export type Lang = 'zh' | 'en'

export type ThemeName = 'midnight' | 'ocean' | 'paper'

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    // Header
    'app.title': '准双曲面齿轮节锥几何模型',
    'app.subtitle': 'Hypoid Gear Pitch Cone Geometry · 交互式三维可视化',
    // Badges
    'badge.sigma': 'Σ',
    'badge.ep': 'Eₚ',
    'badge.gamma': 'γ',
    'badge.Gamma': 'Γ',
    // Section headers
    'section.params': '参数调节',
    'section.steps': '构建步骤',
    'section.results': '计算结果',
    'section.derived': '衍生参数',
    'section.legend': '图例',
    'section.formulas': '关键公式',
    // Parameter labels
    'param.sigma': '轴夹角 Σ',
    'param.ep': '偏置距 Eₚ',
    'param.pRatio': '节点位置 P (沿 K₁K₂)',
    // Presets
    'preset.label': '参数预设',
    'preset.standard': '标准90°',
    'preset.automotive': '汽车驱动桥',
    'preset.smallOffset': '小偏置',
    'preset.nonOrthogonal': '非正交',
    'preset.heavyDuty': '重载工业',
    'preset.standard.desc': '典型正交准双曲面齿轮',
    'preset.automotive.desc': '大偏置距，轿车主减速器',
    'preset.smallOffset.desc': '小偏置距，近螺旋锥齿轮',
    'preset.nonOrthogonal.desc': '非90°轴夹角配置',
    'preset.heavyDuty.desc': '大偏置重型工业齿轮',
    // Action buttons
    'btn.reset': '↺ 重置',
    'btn.stepPlay': '▶ 单步',
    'btn.autoPlay': '⏵ 自动播放',
    'btn.stopPlay': '⏸ 停止',
    'btn.share': '🔗 分享参数',
    'btn.shared': '✓ 已复制链接',
    'btn.measure': '📏 测量',
    'btn.measureClear': '✕',
    // Toggles
    'toggle.rotateCones': '节锥旋转动画',
    'toggle.comparison': '螺旋锥齿轮对比',
    'toggle.comparison.tip': '叠加显示 Eₚ≈0 的螺旋锥齿轮节锥（灰色线框），对比偏置距对几何的影响',
    'toggle.sweep': '参数扫描',
    'toggle.sweepBtn': '⏵ 扫描',
    'toggle.sweepStop': '⏹ 停止',
    // Expandable sections
    'expand.crossSection': '▸ 截面分析',
    'expand.effectGraph': '▸ 参数影响图',
    'expand.formulaDerivation': '▸ 公式推导',
    'expand.coneUnroll': '▸ 锥面展开',
    'expand.presetComparison': '📊 预设对比',
    'expand.involuteProfile': '▸ 渐开线齿廓',
    'expand.sensitivityHeatmap': '🗺️ 参数敏感度热力图',
    // Step names
    'step.0': '① 直线 K₁K₂',
    'step.1': '② 节点 P',
    'step.2': '③ 交错轴线 p, g',
    'step.3': '④ 偏置距 Eₚ',
    'step.4': '⑤ 节平面 T',
    'step.5': '⑥ 交点 H₁, H₂',
    'step.6': '⑦ 节锥面',
    // Step descriptions
    'stepDesc.0': '绘制直线，选定 K₁、K₂ 两点',
    'stepDesc.1': 'K₁K₂ 之间选择节点 P',
    'stepDesc.2': '两条交错轴线过 K₁、K₂，夹角 Σ',
    'stepDesc.3': '轴线间最短距离 Eₚ = O₁O₂',
    'stepDesc.4': '过 P 作 ⊥ K₁K₂ 的平面 T',
    'stepDesc.5': 'T 与轴线交于 H₁、H₂',
    'stepDesc.6': 'H₁P、H₂P 绕轴线旋转成锥',
    // Detailed step descriptions
    'stepDetail.0': '在空间中选择两点 K₁ 和 K₂，连线 K₁K₂ 确定了节锥几何的基本参考方向。K₁ 在小轮轴线 p 上，K₂ 在大轮轴线 g 上。',
    'stepDetail.1': '在直线 K₁K₂ 上选取节点 P，P 的位置决定了两轮的传动比和偏置关系。P 到 K₁ 和 K₂ 的比例影响节锥角的大小。',
    'stepDetail.2': '两条交错轴线 p 和 g 分别穿过 K₁ 和 K₂，夹角为轴夹角 Σ。小轮轴线倾斜 Σ 角度，大轮轴线沿 z 方向。',
    'stepDetail.3': '两轴线之间的最短距离称为偏置距 Eₚ，由公垂线的垂足 O₁（在轴 p 上）和 O₂（在轴 g 上）确定。这是准双曲面齿轮区别于螺旋锥齿轮的关键特征。',
    'stepDetail.4': '过节点 P 作垂直于 K₁K₂ 的平面 T，称为节平面。节平面是确定节锥参数的重要参考平面，H₁P 和 H₂P 都在平面 T 内。',
    'stepDetail.5': '节平面 T 与小轮轴线 p 的交点为 H₁，与大轮轴线 g 的交点为 H₂。H₁P 垂直于轴 p，H₂P 垂直于轴 g。',
    'stepDetail.6': '将 H₁P 绕轴 p 旋转形成小轮节锥面（锥角 γ），H₂P 绕轴 g 旋转形成大轮节锥面（锥角 Γ）。两节锥在节点 P 相切，保证传动连续性。',
    // Computed value labels
    'val.gamma': '小轮节锥角 γ',
    'val.Gamma': '大轮节锥角 Γ',
    'val.ratio': 'R / Rₚ',
    'val.H1P': '|H₁P| 小轮母线',
    'val.H2P': '|H₂P| 大轮母线',
    'val.Ap': '小轮节锥距 Aₚ',
    'val.A': '大轮节锥距 A',
    'val.Rp': '小轮节圆半径 Rₚ',
    'val.R': '大轮节圆半径 R',
    'val.eta': '小轮偏置角 η',
    'val.epsilon': '大轮偏置角 ε',
    'val.epsilonPrime': '偏置角 ε\'',
    'val.Zp': '小轮轴向距离 Zₚ',
    'val.Z': '轴向距离 Z',
    'val.Zg': '大轮轴向距离 Zg',
    'val.G': '大轮节锥距 G',
    // Computed value tooltips
    'tip.gamma': '小轮节锥角 γ：小轮轴线与母线H₁P的夹角，决定小轮的锥度',
    'tip.Gamma': '大轮节锥角 Γ：大轮轴线与母线H₂P的夹角，决定大轮的锥度',
    'tip.ratio': '传动比 R/Rₚ：大轮与小轮的节圆半径之比，反映齿轮的传动比',
    'tip.H1P': '|H₁P| 小轮母线长度：从小轮轴线到节点P的距离',
    'tip.H2P': '|H₂P| 大轮母线长度：从大轮轴线到节点P的距离',
    'tip.Ap': '小轮节锥距 Aₚ：从小轮节锥顶点Vₚ到H₁的距离',
    'tip.A': '大轮节锥距 A：从大轮节锥顶点Vg到H₂的距离',
    // 3D labels
    'label.P': 'P (节点)',
    'label.axisP': 'p (小轮轴线)',
    'label.axisG': 'g (大轮轴线)',
    'label.planeT': 'T (节平面，⊥ K₁K₂)',
    'label.comparison': '螺旋锥齿轮 (Eₚ≈0)',
    // Camera hints
    'hint.mouse': '🖱️ 左键旋转 · 右键平移 · 滚轮缩放',
    'hint.keyboard': '⌨️ 空格单步 · R旋转 · C对比 · A自动 · 1-4视角',
    // Camera buttons
    'cam.iso': '透视',
    'cam.front': '正视',
    'cam.side': '侧视',
    'cam.top': '俯视',
    // Mobile
    'mobile.openPanel': '☰ 打开面板',
    'mobile.closePanel': '✕ 关闭面板',
    // Step toggle
    'steps.hideAll': '全部隐藏',
    'steps.showAll': '全部显示',
    // Measurement tool
    'measure.selectA': '点击选择点 A',
    'measure.selectB': '点击选择点 B',
    'measure.distance': '距离',
    'measure.freeClickA': '自由点 A',
    'measure.freeClickB': '自由点 B',
    'measure.freeClickHint': '点击3D场景任意位置选点',
    // Hover info
    'hover.coords': '坐标',
    // Legend
    'legend.smallCone': '小轮节锥',
    'legend.largeCone': '大轮节锥',
    'legend.node': '节点',
    'legend.plane': '节平面',
    'legend.offset': '偏置线',
    'legend.kline': 'K₁K₂ 连线',
    'legend.comparison': '对比(螺旋锥齿轮)',
    // Preset comparison
    'comparison.row.sigma': 'Σ (°)',
    'comparison.row.ep': 'Eₚ',
    'comparison.row.P': 'P',
    'comparison.row.gamma': 'γ (°)',
    'comparison.row.Gamma': 'Γ (°)',
    'comparison.row.ratio': 'R/Rₚ',
    // Involute
    'involute.small': '小轮',
    'involute.large': '大轮',
    'involute.baseCircle': '基圆',
    'involute.pitchCircle': '节圆',
    'involute.addendumCircle': '齿顶圆',
    'involute.dedendumCircle': '齿根圆',
    'involute.toothCount': '齿数',
    'involute.module': '模数',
    // Screenshot
    'btn.screenshot': '📸 截图',
    'btn.screenshotSuccess': '✓ 已保存截图',
    // Undo/Redo
    'btn.undo': '↩ 撤销',
    'btn.redo': '↪ 重做',
    // Fullscreen
    'btn.fullscreen': '⛶ 全屏',
    'btn.exitFullscreen': '✕ 退出全屏',
    // Help
    'btn.help': '❓ 帮助',
    'help.title': '帮助 · 快捷键与功能',
    'help.shortcuts': '键盘快捷键',
    'help.features': '功能概览',
    'help.key.space': '单步演示',
    'help.key.r': '旋转动画',
    'help.key.c': '对比叠加',
    'help.key.a': '自动播放',
    'help.key.esc': '重置 / 退出全屏',
    'help.key.1-4': '切换视角',
    'help.key.ctrlZ': '撤销参数',
    'help.key.ctrlShiftZ': '重做参数',
    'help.key.f': '全屏模式',
    'help.feature.3d': '3D 交互式准双曲面齿轮节锥可视化',
    'help.feature.params': '参数调节：轴夹角 Σ、偏置距 Eₚ、节点位置 P',
    'help.feature.steps': '7 步构建过程，逐步展示几何关系',
    'help.feature.presets': '5 组参数预设（标准90°、汽车驱动桥等）',
    'help.feature.measure': '3D 测量工具：选择任意两点计算距离',
    'help.feature.compare': '螺旋锥齿轮对比叠加',
    'help.feature.sweep': '参数扫描动画',
    'help.feature.share': 'URL 参数分享',
    'help.feature.save': '保存/加载参数集',
    'help.feature.screenshot': '截图导出为 PNG',
    'help.feature.undo': '参数撤销/重做（最多50步）',
    'help.feature.fullscreen': '3D 画布全屏模式',
    'help.feature.i18n': '中英文切换',
    'help.feature.involute': '渐开线齿廓可视化',
    'help.feature.unroll': '节锥面展开图',
    'help.feature.derivation': '公式推导面板',
    'help.feature.graph': '参数影响曲线图',
    'help.feature.heatmap': '参数敏感度热力图',
    'help.feature.meshing': '齿轮啮合仿真动画',
    'help.feature.theme': '主题切换（午夜/海洋/纸张）',
    'help.feature.freeclick': '自由点击射线测量',
    // Toast
    'toast.screenshot': '截图已保存',
    // Gear Ratio Calculator
    'section.gearRatio': '传动比计算器',
    'gearRatio.ratio': '齿数比 z₂/z₁',
    'gearRatio.betaP': '小轮螺旋角 βₚ',
    'gearRatio.betaG': '大轮螺旋角 βg',
    'gearRatio.sumDist': '节锥距之和 Aₚ+A',
    'gearRatio.offsetRatio': '偏置比 Eₚ/A',
    // Camera coordinate display
    'cam.position': '相机',
    'cam.target': '目标',
    // Timeline step names (full)
    'timeline.step.0': 'K₁K₂ 连线',
    'timeline.step.1': '节点 P',
    'timeline.step.2': '交错轴线',
    'timeline.step.3': '偏置距 Eₚ',
    'timeline.step.4': '节平面 T',
    'timeline.step.5': '交点 H₁H₂',
    'timeline.step.6': '节锥面',
    // Theme
    'theme.midnight': '午夜',
    'theme.ocean': '海洋',
    'theme.paper': '纸张',
    'theme.label': '🎨 主题',
    // Sensitivity Heatmap
    'heatmap.title': '参数敏感度热力图',
    'heatmap.viewGamma': 'γ 视图',
    'heatmap.viewGammaLarge': 'Γ 视图',
    'heatmap.xAxis': 'Eₚ',
    'heatmap.yAxis': 'Σ',
    'heatmap.clickHint': '点击热力图设置参数',
    'heatmap.legend': '色标',
    'heatmap.unit': '°',
    // Gear Meshing
    'toggle.meshing': '⚙ 啮合仿真',
    'meshing.contactZone': '接触区',
    // Footer status
    'footer.fps': 'FPS',
    'footer.theme': '主题',
    'footer.steps': '步骤',
    'footer.of': '/',
    // Video Recording
    'btn.record': '🎬 录制',
    'btn.stopRecord': '⏹ 停止',
    'record.hint': '录制中...',
    'record.indicator': '● 录制中',
    // Tolerance Analysis
    'expand.tolerance': '🔬 公差分析 / Tolerance Analysis',
    'tolerance.base': '基准值',
    'tolerance.plusDEp': '+ΔEₚ',
    'tolerance.minusDEp': '-ΔEₚ',
    'tolerance.plusDSigma': '+ΔΣ',
    'tolerance.minusDSigma': '-ΔΣ',
    'tolerance.gammaCol': 'γ (°)',
    'tolerance.GammaCol': 'Γ (°)',
    'tolerance.sensitivity': '敏感度',
    'tolerance.deltaEp': 'ΔEₚ = ±0.1',
    'tolerance.deltaSigma': 'ΔΣ = ±2°',
    'tolerance.change': '变化率 %',
    // Parameter History
    'expand.paramHistory': '📈 参数历史 / Parameter History',
    'history.index': '变更序号',
    'history.angle': '角度 (°)',
    'history.gammaLine': 'γ 小轮节锥角',
    'history.GammaLine': 'Γ 大轮节锥角',
    'history.tooltip': '序号',
    // Contact Ellipse
    'contactEllipse.label': '接触椭圆',
    // Loading splash
    'loading.text': '正在加载...',
    // Help features
    'help.feature.record': '视频录制 (WebM)',
    'help.feature.tolerance': '公差分析 (制造敏感度)',
    'help.feature.paramHistory': '参数历史图表',
    'help.feature.contactEllipse': '接触椭圆可视化',
    // SVG Export
    'btn.svgExport': '📥 SVG',
    'btn.svgExportSuccess': '✓ SVG已导出',
    // Helical Tooth Lines
    'helical.label': '螺旋齿线',
    // 3D Compass
    'compass.label': '🧭 罗盘',
    // Parameter Comparison
    'expand.paramCompare': '🔄 参数对比 / Param Compare',
    'compare.current': '当前',
    'compare.target': '对比',
    'compare.blend': '混合度',
    'compare.sigmaComp': 'Σ 对比',
    'compare.epComp': 'Eₚ 对比',
    'compare.pComp': 'P 对比',
    'help.feature.svgExport': 'SVG 2D截面图导出',
    'help.feature.helical': '螺旋齿线动画',
    'help.feature.compass': '3D罗盘指示器',
    'help.feature.paramCompare': '参数对比滑块',
    // Footer enhanced
    'footer.orbit': '旋转中',
    // PDF Report
    'btn.report': '📄 报告',
    'btn.reportSuccess': '✓ 报告已生成',
    // Force Vectors
    'toggle.forceVectors': '⚡ 力向量',
    'force.Fn': '法向力 Fn',
    'force.Ft': '切向力 Ft',
    'force.Fr': '径向力 Fr',
    // Cutaway
    'toggle.cutaway': '✂️ 截面剖切',
    // Assembly
    'expand.assembly': '🔧 装配图 / Assembly Diagram',
    'assembly.pinion': '小轮',
    'assembly.gear': '大轮',
    'assembly.offset': '偏置距 Eₚ',
    'assembly.shaftAngle': '轴夹角 Σ',
    'assembly.tangent': '公切线',
    'assembly.rotation': '旋转方向',
    'assembly.title': '准双曲面齿轮副装配俯视图',
    // Help features
    'help.feature.report': '可打印 PDF 报告',
    'help.feature.forceVectors': '3D 力向量箭头',
    'help.feature.cutaway': '锥体截面剖切',
    'help.feature.assembly': '齿轮副装配图',
    // Cone Generator Lines
    'toggle.showConeGenerators': '📐 母线显示',
    'generators.label': '母线',
    // Cone Normals
    'toggle.showNormals': '🧭 法向量',
    'normal.smallCone': 'nₚ',
    'normal.largeCone': 'ng',
    // Cone Axis Distance
    'dim.Ap': 'Aₚ',
    'dim.A': 'A',
    // Vertex markers
    'vertex.subtitle': '节锥顶点',
    'vertex.subtitleEn': 'Pitch Cone Vertex',
  },
  en: {
    // Header
    'app.title': 'Hypoid Gear Pitch Cone Geometry',
    'app.subtitle': 'Hypoid Gear Pitch Cone Geometry · Interactive 3D Visualization',
    // Badges
    'badge.sigma': 'Σ',
    'badge.ep': 'Eₚ',
    'badge.gamma': 'γ',
    'badge.Gamma': 'Γ',
    // Section headers
    'section.params': 'PARAMETERS',
    'section.steps': 'CONSTRUCTION STEPS',
    'section.results': 'COMPUTED RESULTS',
    'section.derived': 'DERIVED PARAMETERS',
    'section.legend': 'LEGEND',
    'section.formulas': 'KEY FORMULAS',
    // Parameter labels
    'param.sigma': 'Shaft Angle Σ',
    'param.ep': 'Offset Eₚ',
    'param.pRatio': 'Node P Position (along K₁K₂)',
    // Presets
    'preset.label': 'Presets',
    'preset.standard': 'Standard 90°',
    'preset.automotive': 'Automotive',
    'preset.smallOffset': 'Small Offset',
    'preset.nonOrthogonal': 'Non-Orthogonal',
    'preset.heavyDuty': 'Heavy Duty',
    'preset.standard.desc': 'Typical orthogonal hypoid gear',
    'preset.automotive.desc': 'Large offset, automotive differential',
    'preset.smallOffset.desc': 'Small offset, near spiral bevel',
    'preset.nonOrthogonal.desc': 'Non-90° shaft angle config',
    'preset.heavyDuty.desc': 'Large offset heavy-duty gear',
    // Action buttons
    'btn.reset': '↺ Reset',
    'btn.stepPlay': '▶ Step',
    'btn.autoPlay': '⏵ Auto Play',
    'btn.stopPlay': '⏸ Stop',
    'btn.share': '🔗 Share',
    'btn.shared': '✓ Link Copied',
    'btn.measure': '📏 Measure',
    'btn.measureClear': '✕',
    // Toggles
    'toggle.rotateCones': 'Cone Rotation Animation',
    'toggle.comparison': 'Spiral Bevel Comparison',
    'toggle.comparison.tip': 'Overlay spiral bevel gear (Eₚ≈0) cones in gray wireframe to compare offset effect',
    'toggle.sweep': 'Param Sweep',
    'toggle.sweepBtn': '⏵ Sweep',
    'toggle.sweepStop': '⏹ Stop',
    // Expandable sections
    'expand.crossSection': '▸ Cross Section',
    'expand.effectGraph': '▸ Effect Graph',
    'expand.formulaDerivation': '▸ Formula Derivation',
    'expand.coneUnroll': '▸ Cone Unrolling',
    'expand.presetComparison': '📊 Preset Comparison',
    'expand.involuteProfile': '▸ Involute Profile',
    'expand.sensitivityHeatmap': '🗺️ Sensitivity Heatmap',
    // Step names
    'step.0': '① Line K₁K₂',
    'step.1': '② Node P',
    'step.2': '③ Skew Axes p, g',
    'step.3': '④ Offset Eₚ',
    'step.4': '⑤ Pitch Plane T',
    'step.5': '⑥ Intersections H₁, H₂',
    'step.6': '⑦ Pitch Cones',
    // Step descriptions
    'stepDesc.0': 'Draw line, select points K₁, K₂',
    'stepDesc.1': 'Choose node P along K₁K₂',
    'stepDesc.2': 'Two skew axes through K₁, K₂, angle Σ',
    'stepDesc.3': 'Shortest distance between axes Eₚ = O₁O₂',
    'stepDesc.4': 'Plane through P, ⊥ K₁K₂',
    'stepDesc.5': 'T intersects axes at H₁, H₂',
    'stepDesc.6': 'Rotate H₁P, H₂P around axes to form cones',
    // Detailed step descriptions
    'stepDetail.0': 'Select two points K₁ and K₂ in space. The line K₁K₂ establishes the fundamental reference direction for the pitch cone geometry. K₁ lies on the pinion axis p, K₂ on the gear axis g.',
    'stepDetail.1': 'Select node P along line K₁K₂. The position of P determines the transmission ratio and offset relationship between the two gears. The ratio of P to K₁ and K₂ affects the pitch cone angles.',
    'stepDetail.2': 'Two skew axes p and g pass through K₁ and K₂ respectively, with shaft angle Σ between them. The pinion axis is tilted by Σ, and the gear axis is along the z-direction.',
    'stepDetail.3': 'The shortest distance between the two axes is called the offset Eₚ, determined by the common perpendicular feet O₁ (on axis p) and O₂ (on axis g). This is the key feature distinguishing hypoid gears from spiral bevel gears.',
    'stepDetail.4': 'Construct plane T through node P perpendicular to K₁K₂, called the pitch plane. The pitch plane is an important reference plane for determining pitch cone parameters. Both H₁P and H₂P lie within plane T.',
    'stepDetail.5': 'The intersection of pitch plane T with the pinion axis p is H₁, and with the gear axis g is H₂. H₁P is perpendicular to axis p, H₂P is perpendicular to axis g.',
    'stepDetail.6': 'Rotating H₁P around axis p forms the pinion pitch cone (cone angle γ), and rotating H₂P around axis g forms the gear pitch cone (cone angle Γ). The two pitch cones are tangent at node P, ensuring transmission continuity.',
    // Computed value labels
    'val.gamma': 'Pinion Cone Angle γ',
    'val.Gamma': 'Gear Cone Angle Γ',
    'val.ratio': 'R / Rₚ',
    'val.H1P': '|H₁P| Pinion Gen.',
    'val.H2P': '|H₂P| Gear Gen.',
    'val.Ap': 'Pinion Cone Dist. Aₚ',
    'val.A': 'Gear Cone Dist. A',
    'val.Rp': 'Pinion Pitch Radius Rₚ',
    'val.R': 'Gear Pitch Radius R',
    'val.eta': 'Pinion Offset Angle η',
    'val.epsilon': 'Gear Offset Angle ε',
    'val.epsilonPrime': 'Offset Angle ε\'',
    'val.Zp': 'Pinion Axial Dist. Zₚ',
    'val.Z': 'Axial Distance Z',
    'val.Zg': 'Gear Axial Dist. Zg',
    'val.G': 'Gear Cone Distance G',
    // Computed value tooltips
    'tip.gamma': 'Pinion pitch cone angle γ: angle between pinion axis and generatrix H₁P, determines pinion taper',
    'tip.Gamma': 'Gear pitch cone angle Γ: angle between gear axis and generatrix H₂P, determines gear taper',
    'tip.ratio': 'Gear ratio R/Rₚ: ratio of gear to pinion pitch circle radii, reflects transmission ratio',
    'tip.H1P': '|H₁P| pinion generatrix length: distance from pinion axis to node P',
    'tip.H2P': '|H₂P| gear generatrix length: distance from gear axis to node P',
    'tip.Ap': 'Pinion cone distance Aₚ: distance from pinion cone apex Vₚ to H₁',
    'tip.A': 'Gear cone distance A: distance from gear cone apex Vg to H₂',
    // 3D labels
    'label.P': 'P (Node)',
    'label.axisP': 'p (Pinion Axis)',
    'label.axisG': 'g (Gear Axis)',
    'label.planeT': 'T (Pitch Plane, ⊥ K₁K₂)',
    'label.comparison': 'Spiral Bevel (Eₚ≈0)',
    // Camera hints
    'hint.mouse': '🖱️ Left: Rotate · Right: Pan · Scroll: Zoom',
    'hint.keyboard': '⌨️ Space: Step · R: Rotate · C: Compare · A: Auto · 1-4: Views',
    // Camera buttons
    'cam.iso': 'Iso',
    'cam.front': 'Front',
    'cam.side': 'Side',
    'cam.top': 'Top',
    // Mobile
    'mobile.openPanel': '☰ Open Panel',
    'mobile.closePanel': '✕ Close Panel',
    // Step toggle
    'steps.hideAll': 'Hide All',
    'steps.showAll': 'Show All',
    // Measurement tool
    'measure.selectA': 'Click to select point A',
    'measure.selectB': 'Click to select point B',
    'measure.distance': 'Distance',
    'measure.freeClickA': 'Free Point A',
    'measure.freeClickB': 'Free Point B',
    'measure.freeClickHint': 'Click anywhere in 3D scene to select',
    // Hover info
    'hover.coords': 'Coords',
    // Legend
    'legend.smallCone': 'Pinion Cone',
    'legend.largeCone': 'Gear Cone',
    'legend.node': 'Node',
    'legend.plane': 'Pitch Plane',
    'legend.offset': 'Offset Line',
    'legend.kline': 'K₁K₂ Line',
    'legend.comparison': 'Comparison (Spiral Bevel)',
    // Preset comparison
    'comparison.row.sigma': 'Σ (°)',
    'comparison.row.ep': 'Eₚ',
    'comparison.row.P': 'P',
    'comparison.row.gamma': 'γ (°)',
    'comparison.row.Gamma': 'Γ (°)',
    'comparison.row.ratio': 'R/Rₚ',
    // Involute
    'involute.small': 'Pinion',
    'involute.large': 'Gear',
    'involute.baseCircle': 'Base Circle',
    'involute.pitchCircle': 'Pitch Circle',
    'involute.addendumCircle': 'Addendum Circle',
    'involute.dedendumCircle': 'Dedendum Circle',
    'involute.toothCount': 'Teeth',
    'involute.module': 'Module',
    // Screenshot
    'btn.screenshot': '📸 Screenshot',
    'btn.screenshotSuccess': '✓ Screenshot Saved',
    // Undo/Redo
    'btn.undo': '↩ Undo',
    'btn.redo': '↪ Redo',
    // Fullscreen
    'btn.fullscreen': '⛶ Fullscreen',
    'btn.exitFullscreen': '✕ Exit Fullscreen',
    // Help
    'btn.help': '❓ Help',
    'help.title': 'Help · Shortcuts & Features',
    'help.shortcuts': 'Keyboard Shortcuts',
    'help.features': 'Feature Overview',
    'help.key.space': 'Step-by-step demo',
    'help.key.r': 'Toggle cone rotation',
    'help.key.c': 'Toggle comparison overlay',
    'help.key.a': 'Auto-play animation',
    'help.key.esc': 'Reset / Exit fullscreen',
    'help.key.1-4': 'Switch camera view',
    'help.key.ctrlZ': 'Undo parameter change',
    'help.key.ctrlShiftZ': 'Redo parameter change',
    'help.key.f': 'Toggle fullscreen',
    'help.feature.3d': '3D interactive hypoid gear pitch cone visualization',
    'help.feature.params': 'Parameter adjustment: shaft angle Σ, offset Eₚ, node P position',
    'help.feature.steps': '7-step construction process, showing geometric relationships',
    'help.feature.presets': '5 parameter presets (Standard 90°, Automotive, etc.)',
    'help.feature.measure': '3D measurement tool: select any two points for distance',
    'help.feature.compare': 'Spiral bevel gear comparison overlay',
    'help.feature.sweep': 'Parameter sweep animation',
    'help.feature.share': 'URL parameter sharing',
    'help.feature.save': 'Save/load parameter sets',
    'help.feature.screenshot': 'Screenshot export as PNG',
    'help.feature.undo': 'Parameter undo/redo (up to 50 steps)',
    'help.feature.fullscreen': '3D canvas fullscreen mode',
    'help.feature.i18n': 'English/Chinese language toggle',
    'help.feature.involute': 'Involute gear tooth profile visualization',
    'help.feature.unroll': 'Pitch cone unrolling diagram',
    'help.feature.derivation': 'Formula derivation panel',
    'help.feature.graph': 'Parameter effect graph',
    'help.feature.heatmap': 'Parameter sensitivity heatmap',
    'help.feature.meshing': 'Gear meshing simulation animation',
    'help.feature.theme': 'Theme switcher (Midnight/Ocean/Paper)',
    'help.feature.freeclick': 'Free-click raycaster measurement',
    // Toast
    'toast.screenshot': 'Screenshot saved',
    // Gear Ratio Calculator
    'section.gearRatio': 'GEAR RATIO CALCULATOR',
    'gearRatio.ratio': 'Gear Ratio z₂/z₁',
    'gearRatio.betaP': 'Pinion Spiral Angle βₚ',
    'gearRatio.betaG': 'Gear Spiral Angle βg',
    'gearRatio.sumDist': 'Sum of Cone Dist. Aₚ+A',
    'gearRatio.offsetRatio': 'Offset Ratio Eₚ/A',
    // Camera coordinate display
    'cam.position': 'Cam',
    'cam.target': 'Target',
    // Timeline step names (full)
    'timeline.step.0': 'K₁K₂ Line',
    'timeline.step.1': 'Node P',
    'timeline.step.2': 'Skew Axes',
    'timeline.step.3': 'Offset Eₚ',
    'timeline.step.4': 'Pitch Plane T',
    'timeline.step.5': 'Points H₁H₂',
    'timeline.step.6': 'Pitch Cones',
    // Theme
    'theme.midnight': 'Midnight',
    'theme.ocean': 'Ocean',
    'theme.paper': 'Paper',
    'theme.label': '🎨 Theme',
    // Sensitivity Heatmap
    'heatmap.title': 'Parameter Sensitivity Heatmap',
    'heatmap.viewGamma': 'γ View',
    'heatmap.viewGammaLarge': 'Γ View',
    'heatmap.xAxis': 'Eₚ',
    'heatmap.yAxis': 'Σ',
    'heatmap.clickHint': 'Click heatmap to set parameters',
    'heatmap.legend': 'Scale',
    'heatmap.unit': '°',
    // Gear Meshing
    'toggle.meshing': '⚙ Meshing Sim',
    'meshing.contactZone': 'Contact Zone',
    // Footer status
    'footer.fps': 'FPS',
    'footer.theme': 'Theme',
    'footer.steps': 'Steps',
    'footer.of': '/',
    // Video Recording
    'btn.record': '🎬 Record',
    'btn.stopRecord': '⏹ Stop',
    'record.hint': 'Recording...',
    'record.indicator': '● REC',
    // Tolerance Analysis
    'expand.tolerance': '🔬 Tolerance Analysis',
    'tolerance.base': 'Base',
    'tolerance.plusDEp': '+ΔEₚ',
    'tolerance.minusDEp': '-ΔEₚ',
    'tolerance.plusDSigma': '+ΔΣ',
    'tolerance.minusDSigma': '-ΔΣ',
    'tolerance.gammaCol': 'γ (°)',
    'tolerance.GammaCol': 'Γ (°)',
    'tolerance.sensitivity': 'Sensitivity',
    'tolerance.deltaEp': 'ΔEₚ = ±0.1',
    'tolerance.deltaSigma': 'ΔΣ = ±2°',
    'tolerance.change': 'Change %',
    // Parameter History
    'expand.paramHistory': '📈 Parameter History',
    'history.index': 'Change Index',
    'history.angle': 'Angle (°)',
    'history.gammaLine': 'γ Pinion Cone Angle',
    'history.GammaLine': 'Γ Gear Cone Angle',
    'history.tooltip': 'Index',
    // Contact Ellipse
    'contactEllipse.label': 'Contact Ellipse',
    // Loading splash
    'loading.text': 'Loading...',
    // Help features
    'help.feature.record': 'Video Recording (WebM)',
    'help.feature.tolerance': 'Tolerance Analysis (Mfg Sensitivity)',
    'help.feature.paramHistory': 'Parameter History Graph',
    'help.feature.contactEllipse': 'Contact Ellipse Visualization',
    // SVG Export
    'btn.svgExport': '📥 SVG',
    'btn.svgExportSuccess': '✓ SVG Exported',
    // Helical Tooth Lines
    'helical.label': 'Helical Lines',
    // 3D Compass
    'compass.label': '🧭 Compass',
    // Parameter Comparison
    'expand.paramCompare': '🔄 Param Compare',
    'compare.current': 'Current',
    'compare.target': 'Compare',
    'compare.blend': 'Blend',
    'compare.sigmaComp': 'Σ Compare',
    'compare.epComp': 'Eₚ Compare',
    'compare.pComp': 'P Compare',
    'help.feature.svgExport': 'SVG 2D Cross-Section Export',
    'help.feature.helical': 'Helical Tooth Line Animation',
    'help.feature.compass': '3D Compass Indicator',
    'help.feature.paramCompare': 'Parameter Comparison Slider',
    // Footer enhanced
    'footer.orbit': 'Orbiting',
    // PDF Report
    'btn.report': '📄 Report',
    'btn.reportSuccess': '✓ Report Generated',
    // Force Vectors
    'toggle.forceVectors': '⚡ Force Vectors',
    'force.Fn': 'Normal Fn',
    'force.Ft': 'Tangential Ft',
    'force.Fr': 'Radial Fr',
    // Cutaway
    'toggle.cutaway': '✂️ Cutaway',
    // Assembly
    'expand.assembly': '🔧 Assembly Diagram',
    'assembly.pinion': 'Pinion',
    'assembly.gear': 'Gear',
    'assembly.offset': 'Offset Eₚ',
    'assembly.shaftAngle': 'Shaft Angle Σ',
    'assembly.tangent': 'Common Tangent',
    'assembly.rotation': 'Rotation',
    'assembly.title': 'Hypoid Gear Pair Assembly Top View',
    // Help features
    'help.feature.report': 'Printable PDF Report',
    'help.feature.forceVectors': '3D Force Vector Arrows',
    'help.feature.cutaway': 'Cone Cross-Section Cutaway',
    'help.feature.assembly': 'Gear Pair Assembly Diagram',
    // Cone Generator Lines
    'toggle.showConeGenerators': '📐 Generator Lines',
    'generators.label': 'Generators',
    // Cone Normals
    'toggle.showNormals': '🧭 Surface Normals',
    'normal.smallCone': 'nₚ',
    'normal.largeCone': 'ng',
    // Cone Axis Distance
    'dim.Ap': 'Aₚ',
    'dim.A': 'A',
    // Vertex markers
    'vertex.subtitle': 'Pitch Cone Vertex',
    'vertex.subtitleEn': 'Pitch Cone Vertex',
  },
}

export function t(key: string, lang: Lang): string {
  return translations[lang]?.[key] ?? key
}

export function getStoredLang(): Lang {
  if (typeof window === 'undefined') return 'zh'
  try {
    const stored = localStorage.getItem('hypoid-language')
    if (stored === 'en' || stored === 'zh') return stored
  } catch {
    // ignore
  }
  return 'zh'
}

export function setStoredLang(lang: Lang) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('hypoid-language', lang)
  } catch {
    // ignore
  }
}

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return 'midnight'
  try {
    const stored = localStorage.getItem('hypoid-theme')
    if (stored === 'midnight' || stored === 'ocean' || stored === 'paper') return stored
  } catch {
    // ignore
  }
  return 'midnight'
}

export function setStoredTheme(theme: ThemeName) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('hypoid-theme', theme)
  } catch {
    // ignore
  }
}
