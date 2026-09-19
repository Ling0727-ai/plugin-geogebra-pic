window.__ModuleLoader__.load({
	id: "dsh-plugin-geogebra-pic",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/components/GeoGebraAction/GeoGebraAction.ts
		function useGeoGebraAction({ openGeoGebra }) {
			return (0, react.useCallback)(() => {
				openGeoGebra();
			}, [openGeoGebra]);
		}
		//#endregion
		//#region \0dsh-css:C:\Users\lingxin\Desktop\dsh-plugin\geogebra-pic\src\components\GeoGebraAction\GeoGebraAction.module.css.mjs
		const css$1 = ".gD5R5G_root{position:relative}.gD5R5G_trigger{min-height:28px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);letter-spacing:0;cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:5px;padding:3px 5px;transition:color .15s,background .15s;display:inline-flex}.gD5R5G_trigger:hover,.gD5R5G_trigger:focus-visible{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);outline:none}.gD5R5G_trigger svg{flex:none}@media (width<=720px){.gD5R5G_trigger span{display:none}}";
		const tagId$1 = "dsh-plugin-geogebra-pic/GeoGebraAction.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-plugin-geogebra-pic";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var GeoGebraAction_module_css_default = {
			"root": "gD5R5G_root",
			"trigger": "gD5R5G_trigger"
		};
		//#endregion
		//#region src/components/GeoGebraAction/GeoGebraAction.tsx
		function GeoGebraAction(props) {
			const open = useGeoGebraAction(props);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: GeoGebraAction_module_css_default.root,
				"data-geogebra-action": true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: GeoGebraAction_module_css_default.trigger,
					onClick: open,
					title: props.t("action.open"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t("type.label") })]
				})
			});
		}
		//#endregion
		//#region src/components/GeoGebraWorkspace/GeoGebraWorkspace.data.ts
		const GEOGEBRA_SCRIPT_URL = "https://www.geogebra.org/apps/deployggb.js";
		const STORAGE_PREFIX = "dsh-geogebra-pic:";
		const EXAMPLES = [
			{
				id: "function",
				labelKey: "example.function",
				command: "f(x) = sin(x)"
			},
			{
				id: "circle",
				labelKey: "example.circle",
				command: "A = (0, 0)\nc = Circle(A, 3)\nB = Point(c)\nt = Tangent(B, c)"
			},
			{
				id: "triangle",
				labelKey: "example.triangle",
				command: "A = (-3, -1)\nB = (3, -1)\nC = (1, 3)\np = Polygon(A, B, C)\nc = Circumcircle(A, B, C)"
			},
			{
				id: "slider",
				labelKey: "example.slider",
				command: "a = Slider(-5, 5, 0.1)\nf(x) = a sin(x)"
			}
		];
		//#endregion
		//#region src/components/GeoGebraWorkspace/GeoGebraWorkspace.ts
		let scriptPromise;
		const PNG_EXPORT_SCALE = 2;
		const BASE_DPI = 96;
		function loadGeoGebraScript() {
			if (window.GGBApplet !== void 0) return Promise.resolve();
			if (scriptPromise !== void 0) return scriptPromise;
			const pending = new Promise((resolve, reject) => {
				const existing = document.querySelector(`script[src="${GEOGEBRA_SCRIPT_URL}"]`);
				const script = existing ?? document.createElement("script");
				const loaded = () => {
					if (window.GGBApplet !== void 0) resolve();
					else reject(/* @__PURE__ */ new Error("GeoGebra constructor was not exposed"));
				};
				script.addEventListener("load", loaded, { once: true });
				script.addEventListener("error", () => {
					reject(/* @__PURE__ */ new Error("GeoGebra script failed to load"));
				}, { once: true });
				if (existing === null) {
					script.src = GEOGEBRA_SCRIPT_URL;
					script.async = true;
					script.dataset.geogebraPic = "true";
					document.head.append(script);
				}
			}).catch((error) => {
				scriptPromise = void 0;
				throw error;
			});
			scriptPromise = pending;
			return pending;
		}
		function downloadBase64(filename, mime, value) {
			const link = document.createElement("a");
			link.download = filename;
			link.href = value.startsWith("data:") ? value : `data:${mime};base64,${value}`;
			link.click();
		}
		function downloadText(filename, mime, value) {
			const url = URL.createObjectURL(new Blob([value], { type: mime }));
			const link = document.createElement("a");
			link.download = filename;
			link.href = url;
			link.click();
			URL.revokeObjectURL(url);
		}
		function fileBase64(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					const value = typeof reader.result === "string" ? reader.result.split(",")[1] : void 0;
					if (value === void 0) reject(/* @__PURE__ */ new Error("FileReader returned no data"));
					else resolve(value);
				};
				reader.onerror = () => {
					reject(reader.error ?? /* @__PURE__ */ new Error("FileReader failed"));
				};
				reader.readAsDataURL(file);
			});
		}
		function useGeoGebraWorkspace(persistenceKey, t) {
			const rootRef = (0, react.useRef)(null);
			const appletHostRef = (0, react.useRef)(null);
			const apiRef = (0, react.useRef)();
			const saveTimerRef = (0, react.useRef)();
			const [status, setStatus] = (0, react.useState)("loading");
			const [objects, setObjects] = (0, react.useState)([]);
			const [command, setCommand] = (0, react.useState)("");
			const [commandError, setCommandError] = (0, react.useState)();
			const [panelOpen, setPanelOpen] = (0, react.useState)(false);
			const [gridVisible, setGridVisibleState] = (0, react.useState)(true);
			const [axesVisible, setAxesVisibleState] = (0, react.useState)(true);
			const [generation, setGeneration] = (0, react.useState)(0);
			const syncObjects = (0, react.useCallback)(() => {
				const api = apiRef.current;
				if (api === void 0) return;
				setObjects(api.getAllObjectNames().map((name) => ({
					name,
					type: api.getObjectType(name),
					definition: api.getDefinitionString(name, true) || name,
					color: api.getColor(name),
					visible: api.getVisible(name)
				})));
			}, []);
			const saveConstruction = (0, react.useCallback)(() => {
				const api = apiRef.current;
				if (api === void 0) return;
				if (saveTimerRef.current !== void 0) clearTimeout(saveTimerRef.current);
				saveTimerRef.current = setTimeout(() => {
					api.getBase64((value) => {
						try {
							window.localStorage.setItem(`${STORAGE_PREFIX}${persistenceKey}`, value);
						} catch (error) {
							console.warn("GeoGebra autosave failed:", error);
						}
					});
				}, 500);
			}, [persistenceKey]);
			(0, react.useEffect)(() => {
				const host = appletHostRef.current;
				if (host === null) return;
				let disposed = false;
				let resizeObserver;
				let listeners;
				setStatus("loading");
				host.replaceChildren();
				loadGeoGebraScript().then(() => {
					if (disposed || window.GGBApplet === void 0) return;
					const width = Math.max(320, host.clientWidth);
					const height = Math.max(360, host.clientHeight);
					new window.GGBApplet({
						appName: "classic",
						width,
						height,
						showToolBar: true,
						showMenuBar: false,
						showAlgebraInput: false,
						showResetIcon: false,
						showZoomButtons: true,
						showFullscreenButton: false,
						enableRightClick: true,
						enableLabelDrags: true,
						enableShiftDragZoom: true,
						allowStyleBar: true,
						language: "zh",
						appletOnLoad: (api) => {
							if (disposed) {
								api.remove();
								return;
							}
							apiRef.current = api;
							api.setErrorDialogsActive(false);
							api.enableShiftDragZoom(true);
							api.setGridVisible(1, true);
							api.setAxesVisible(true, true);
							const changed = () => {
								syncObjects();
								saveConstruction();
							};
							listeners = {
								add: changed,
								remove: changed,
								update: changed
							};
							api.registerAddListener(listeners.add);
							api.registerRemoveListener(listeners.remove);
							api.registerUpdateListener(listeners.update);
							const ready = () => {
								syncObjects();
								setStatus("ready");
							};
							const saved = window.localStorage.getItem(`${STORAGE_PREFIX}${persistenceKey}`);
							if (saved !== null) api.setBase64(saved, ready);
							else ready();
							resizeObserver = new ResizeObserver(() => {
								if (host.clientWidth > 0 && host.clientHeight > 0) api.setSize(host.clientWidth, host.clientHeight);
							});
							resizeObserver.observe(host);
						}
					}, true).inject(host);
				}).catch((error) => {
					console.error("GeoGebra load failed:", error);
					if (!disposed) setStatus("error");
				});
				return () => {
					disposed = true;
					resizeObserver?.disconnect();
					if (saveTimerRef.current !== void 0) clearTimeout(saveTimerRef.current);
					const api = apiRef.current;
					if (api !== void 0 && listeners !== void 0) {
						api.unregisterAddListener(listeners.add);
						api.unregisterRemoveListener(listeners.remove);
						api.unregisterUpdateListener(listeners.update);
					}
					api?.remove();
					apiRef.current = void 0;
				};
			}, [
				generation,
				persistenceKey,
				saveConstruction,
				syncObjects
			]);
			const runCommandValue = (0, react.useCallback)((value) => {
				const api = apiRef.current;
				const source = value.trim();
				if (api === void 0 || source.length === 0) return false;
				try {
					if (api.evalCommand(source) === false) throw new Error("evalCommand returned false");
					api.setUndoPoint();
					setCommandError(void 0);
					syncObjects();
					saveConstruction();
					return true;
				} catch {
					setCommandError(t("command.failed"));
					return false;
				}
			}, [
				saveConstruction,
				syncObjects,
				t
			]);
			return {
				rootRef,
				appletHostRef,
				status,
				objects,
				command,
				commandError,
				panelOpen,
				gridVisible,
				axesVisible,
				setCommand,
				setCommandError,
				setPanelOpen,
				submitCommand: (0, react.useCallback)((event) => {
					event.preventDefault();
					if (runCommandValue(command)) setCommand("");
				}, [command, runCommandValue]),
				runCommandValue,
				toggleGrid: (0, react.useCallback)(() => {
					const next = !gridVisible;
					setGridVisibleState(next);
					apiRef.current?.setGridVisible(1, next);
				}, [gridVisible]),
				toggleAxes: (0, react.useCallback)(() => {
					const next = !axesVisible;
					setAxesVisibleState(next);
					apiRef.current?.setAxesVisible(next, next);
				}, [axesVisible]),
				undo: (0, react.useCallback)(() => {
					apiRef.current?.undo();
					syncObjects();
					saveConstruction();
				}, [saveConstruction, syncObjects]),
				redo: (0, react.useCallback)(() => {
					apiRef.current?.redo();
					syncObjects();
					saveConstruction();
				}, [saveConstruction, syncObjects]),
				clear: (0, react.useCallback)(() => {
					const api = apiRef.current;
					if (api === void 0 || !window.confirm(t("toolbar.clearConfirm"))) return;
					api.setUndoPoint();
					api.newConstruction();
					syncObjects();
					saveConstruction();
				}, [
					saveConstruction,
					syncObjects,
					t
				]),
				toggleObject: (0, react.useCallback)((name, visible) => {
					apiRef.current?.setVisible(name, !visible);
					syncObjects();
					saveConstruction();
				}, [saveConstruction, syncObjects]),
				deleteObject: (0, react.useCallback)((name) => {
					apiRef.current?.deleteObject(name);
					apiRef.current?.setUndoPoint();
					syncObjects();
					saveConstruction();
				}, [saveConstruction, syncObjects]),
				exportPng: (0, react.useCallback)(() => {
					const value = apiRef.current?.getPNGBase64(PNG_EXPORT_SCALE, false, BASE_DPI * PNG_EXPORT_SCALE);
					if (value !== void 0) downloadBase64("geogebra-drawing.png", "image/png", value);
				}, []),
				exportSvg: (0, react.useCallback)(() => {
					apiRef.current?.exportSVG((svg) => {
						downloadText("geogebra-drawing.svg", "image/svg+xml;charset=utf-8", svg);
					});
				}, []),
				exportGgb: (0, react.useCallback)(() => {
					apiRef.current?.getBase64((value) => {
						downloadBase64("geogebra-drawing.ggb", "application/vnd.geogebra.file", value);
					});
				}, []),
				importGgb: (0, react.useCallback)(async (event) => {
					const file = event.currentTarget.files?.[0];
					event.currentTarget.value = "";
					if (file === void 0 || apiRef.current === void 0) return;
					try {
						const value = await fileBase64(file);
						apiRef.current.setBase64(value, () => {
							syncObjects();
							saveConstruction();
						});
						setCommandError(void 0);
					} catch {
						setCommandError(t("import.failed"));
					}
				}, [
					saveConstruction,
					syncObjects,
					t
				]),
				toggleFullscreen: (0, react.useCallback)(() => {
					const root = rootRef.current;
					if (root === null) return;
					if (document.fullscreenElement === root) document.exitFullscreen();
					else root.requestFullscreen();
				}, []),
				retry: () => {
					setGeneration((value) => value + 1);
				}
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\lingxin\Desktop\dsh-plugin\geogebra-pic\src\components\GeoGebraWorkspace\GeoGebraWorkspace.module.css.mjs
		const css = ".hW_9CG_root{width:100%;min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);letter-spacing:0;flex-direction:column;flex:auto;display:flex;position:relative;overflow:hidden}.hW_9CG_root:fullscreen{background:var(--dsw-alias-bg-base);width:100vw;height:100vh}.hW_9CG_toolbar{z-index:3;background:var(--dsw-alias-bg-layer-1);border-bottom:.5px solid var(--dsw-alias-border-l3);flex-wrap:wrap;flex:none;align-items:center;gap:6px 10px;min-height:43px;padding:6px 8px;display:flex}.hW_9CG_status,.hW_9CG_toolbarGroup{align-items:center;display:flex}.hW_9CG_status{min-width:92px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);flex:none;gap:6px}.hW_9CG_statusDot{background:var(--dsw-alias-state-success-primary,#3aa76d);border-radius:50%;width:7px;height:7px}.hW_9CG_status[data-status=loading] .hW_9CG_statusDot{background:var(--dsw-alias-state-business-primary,#528bff);animation:1.4s ease-in-out infinite hW_9CG_pulse}.hW_9CG_status[data-status=error] .hW_9CG_statusDot{background:var(--dsw-alias-state-error-primary,#e45454)}.hW_9CG_toolbarGroup{flex:none;gap:3px}.hW_9CG_toolbarActions{margin-left:auto}.hW_9CG_iconButton,.hW_9CG_textButton,.hW_9CG_retryButton,.hW_9CG_rowAction,.hW_9CG_commandBar button{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:6px;justify-content:center;align-items:center;transition:color .15s,background .15s,opacity .15s;display:inline-flex}.hW_9CG_iconButton{width:28px;height:28px;padding:0}.hW_9CG_iconButton input{display:none}.hW_9CG_textButton{min-width:32px;height:28px;font:600 10px/1 var(--dsw-font-family,sans-serif);padding:0 5px}.hW_9CG_iconButton:hover:not(:disabled),.hW_9CG_textButton:hover:not(:disabled),.hW_9CG_rowAction:hover,.hW_9CG_commandBar button:hover:not(:disabled),.hW_9CG_activeButton{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.hW_9CG_iconButton:focus-visible,.hW_9CG_textButton:focus-visible,.hW_9CG_retryButton:focus-visible,.hW_9CG_rowAction:focus-visible,.hW_9CG_commandBar button:focus-visible,.hW_9CG_examples button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);outline-offset:1px}.hW_9CG_iconButton:disabled,.hW_9CG_textButton:disabled,.hW_9CG_disabledButton{color:var(--dsw-alias-label-quaternary);pointer-events:none;cursor:default;opacity:.55}.hW_9CG_dangerButton:hover:not(:disabled){color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}.hW_9CG_switchControl{min-height:28px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);cursor:pointer;user-select:none;align-items:center;gap:5px;display:inline-flex}.hW_9CG_switchControl input{opacity:0;width:1px;height:1px;position:absolute}.hW_9CG_switchTrack{background:var(--dsw-alias-bg-layer-3);border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;width:24px;height:14px;transition:background .15s;position:relative}.hW_9CG_switchTrack:after{content:\"\";background:var(--dsw-alias-label-quaternary);border-radius:50%;width:9px;height:9px;transition:transform .15s,background .15s;position:absolute;top:2px;left:2px}.hW_9CG_switchControl input:checked+.hW_9CG_switchTrack{background:color-mix(in srgb, var(--dsw-alias-state-business-primary,#528bff) 35%, transparent);border-color:var(--dsw-alias-state-business-primary,#528bff)}.hW_9CG_switchControl input:checked+.hW_9CG_switchTrack:after{background:var(--dsw-alias-state-business-primary,#528bff);transform:translate(10px)}.hW_9CG_switchControl input:focus-visible+.hW_9CG_switchTrack{outline:2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);outline-offset:1px}.hW_9CG_workArea{flex:auto;min-width:0;min-height:0;display:flex;position:relative}.hW_9CG_canvasArea{background:#fff;flex:auto;min-width:0;min-height:0;position:relative;overflow:hidden}.hW_9CG_appletHost,.hW_9CG_appletHost>div{width:100%;height:100%;min-height:0}.hW_9CG_appletState{z-index:2;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);text-align:center;background:var(--dsw-alias-bg-base);flex-direction:column;justify-content:center;align-items:center;gap:12px;padding:24px;display:flex;position:absolute;inset:0}.hW_9CG_spinner{border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-state-business-primary,#528bff);border-radius:50%;width:22px;height:22px;animation:.8s linear infinite hW_9CG_spin}.hW_9CG_retryButton{min-height:30px;font:var(--dsw-font-xxs-12);background:var(--dsw-alias-interactive-bg-hover);gap:6px;padding:4px 10px}.hW_9CG_panel{z-index:2;background:var(--dsw-alias-bg-layer-1);border-left:.5px solid var(--dsw-alias-border-l3);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);flex-direction:column;flex:0 0 236px;width:236px;min-height:0;display:flex;overflow:auto}.hW_9CG_panelSection{border-bottom:.5px solid var(--dsw-alias-border-l3);padding:12px 10px}.hW_9CG_panelSection h2{color:var(--dsw-alias-label-secondary);font:600 12px/18px var(--dsw-font-family,sans-serif);letter-spacing:0;justify-content:space-between;align-items:baseline;margin:0 0 8px;display:flex}.hW_9CG_panelSection h2 span{color:var(--dsw-alias-label-quaternary);font-weight:400}.hW_9CG_objectList,.hW_9CG_examples{flex-direction:column;gap:3px;display:flex}.hW_9CG_objectRow{border-radius:6px;grid-template-columns:8px minmax(0,1fr) 25px 25px;align-items:center;gap:6px;min-height:40px;padding:3px 4px;display:grid}.hW_9CG_objectRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.hW_9CG_objectColor{border:.5px solid #0000002e;border-radius:50%;width:8px;height:8px}.hW_9CG_objectText{flex-direction:column;min-width:0;display:flex}.hW_9CG_objectText strong{color:var(--dsw-alias-label-primary);font:600 12px/16px var(--dsw-font-family,sans-serif);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.hW_9CG_objectText span{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font:10px/14px ui-monospace,SFMono-Regular,Consolas,monospace;overflow:hidden}.hW_9CG_visibilityToggle{cursor:pointer;place-items:center;width:25px;height:25px;display:grid}.hW_9CG_visibilityToggle input{opacity:0;width:1px;height:1px;position:absolute}.hW_9CG_visibilityToggle span{border:1.5px solid var(--dsw-alias-label-quaternary);border-radius:50%;width:13px;height:8px}.hW_9CG_visibilityToggle input:checked+span{background:var(--dsw-alias-state-business-primary,#528bff);border-color:var(--dsw-alias-state-business-primary,#528bff);box-shadow:inset 0 0 0 3px var(--dsw-alias-bg-layer-1)}.hW_9CG_visibilityToggle input:focus-visible+span{outline:2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);outline-offset:2px}.hW_9CG_rowAction{width:25px;height:25px;color:var(--dsw-alias-label-quaternary);padding:0}.hW_9CG_emptyState{color:var(--dsw-alias-label-quaternary);font:var(--dsw-font-xxxs-11);text-align:center;margin:0;padding:12px 6px}.hW_9CG_examples button{width:100%;min-height:34px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);text-align:left;cursor:pointer;background:0 0;border:.5px solid #0000;border-radius:6px;align-items:center;gap:7px;padding:5px 7px;display:flex}.hW_9CG_examples button:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3)}.hW_9CG_commandBar{z-index:3;background:var(--dsw-alias-bg-layer-1);border-top:.5px solid var(--dsw-alias-border-l3);flex:none;grid-template-columns:20px minmax(0,1fr) 30px;align-items:center;gap:6px;min-height:43px;padding:6px 8px;display:grid;position:relative}.hW_9CG_commandBar>svg{color:var(--dsw-alias-label-tertiary)}.hW_9CG_commandBar input{box-sizing:border-box;width:100%;min-width:0;height:30px;color:var(--dsw-alias-label-primary);letter-spacing:0;background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;padding:0 9px;font:12px/30px ui-monospace,SFMono-Regular,Consolas,monospace}.hW_9CG_commandBar input:focus{border-color:var(--dsw-alias-brand-primary-new-colorprimary-new-color);outline:1px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);outline-offset:-1px}.hW_9CG_commandBar input[aria-invalid=true]{border-color:var(--dsw-alias-state-error-primary)}.hW_9CG_commandBar button{width:30px;height:30px;color:var(--dsw-alias-label-on-primary,#fff);background:var(--dsw-alias-state-business-primary,#528bff);padding:0}.hW_9CG_commandBar button:disabled{cursor:default;opacity:.4}.hW_9CG_commandError{color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxxs-11);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-state-error-primary);box-shadow:var(--dsw-elevation-raised);border-radius:6px;padding:6px 9px;position:absolute;bottom:39px;left:34px;right:8px}.hW_9CG_srOnly{clip:rect(0, 0, 0, 0);white-space:nowrap;border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}@keyframes hW_9CG_spin{to{transform:rotate(360deg)}}@keyframes hW_9CG_pulse{50%{opacity:.35}}@media (width<=720px){.hW_9CG_toolbar{gap:4px 8px}.hW_9CG_status{min-width:0}.hW_9CG_status span:last-child,.hW_9CG_switchControl>span:last-child{display:none}.hW_9CG_toolbarActions{margin-left:0}.hW_9CG_panel{width:min(236px,76%);position:absolute;top:0;bottom:0;right:0;box-shadow:-8px 0 24px #00000029}}@media (prefers-reduced-motion:reduce){.hW_9CG_spinner,.hW_9CG_statusDot{animation:none}.hW_9CG_iconButton,.hW_9CG_textButton,.hW_9CG_switchTrack,.hW_9CG_switchTrack:after{transition:none}}";
		const tagId = "dsh-plugin-geogebra-pic/GeoGebraWorkspace.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-plugin-geogebra-pic";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var GeoGebraWorkspace_module_css_default = {
			"activeButton": "hW_9CG_activeButton",
			"appletHost": "hW_9CG_appletHost",
			"appletState": "hW_9CG_appletState",
			"canvasArea": "hW_9CG_canvasArea",
			"commandBar": "hW_9CG_commandBar",
			"commandError": "hW_9CG_commandError",
			"dangerButton": "hW_9CG_dangerButton",
			"disabledButton": "hW_9CG_disabledButton",
			"emptyState": "hW_9CG_emptyState",
			"examples": "hW_9CG_examples",
			"iconButton": "hW_9CG_iconButton",
			"objectColor": "hW_9CG_objectColor",
			"objectList": "hW_9CG_objectList",
			"objectRow": "hW_9CG_objectRow",
			"objectText": "hW_9CG_objectText",
			"panel": "hW_9CG_panel",
			"panelSection": "hW_9CG_panelSection",
			"pulse": "hW_9CG_pulse",
			"retryButton": "hW_9CG_retryButton",
			"root": "hW_9CG_root",
			"rowAction": "hW_9CG_rowAction",
			"spin": "hW_9CG_spin",
			"spinner": "hW_9CG_spinner",
			"srOnly": "hW_9CG_srOnly",
			"status": "hW_9CG_status",
			"statusDot": "hW_9CG_statusDot",
			"switchControl": "hW_9CG_switchControl",
			"switchTrack": "hW_9CG_switchTrack",
			"textButton": "hW_9CG_textButton",
			"toolbar": "hW_9CG_toolbar",
			"toolbarActions": "hW_9CG_toolbarActions",
			"toolbarGroup": "hW_9CG_toolbarGroup",
			"visibilityToggle": "hW_9CG_visibilityToggle",
			"workArea": "hW_9CG_workArea"
		};
		//#endregion
		//#region src/components/GeoGebraWorkspace/GeoGebraWorkspace.tsx
		function GeoGebraWorkspace(props) {
			const { tab } = props.useTabInfo();
			const workspace = useGeoGebraWorkspace(tab.id, props.t);
			const disabled = workspace.status !== "ready";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: workspace.rootRef,
				className: GeoGebraWorkspace_module_css_default.root,
				"data-geogebra-workspace": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: GeoGebraWorkspace_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: GeoGebraWorkspace_module_css_default.status,
								"data-status": workspace.status,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: GeoGebraWorkspace_module_css_default.statusDot,
									"aria-hidden": true
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t(`status.${workspace.status}`) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: GeoGebraWorkspace_module_css_default.toolbarGroup,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: GeoGebraWorkspace_module_css_default.switchControl,
									title: props.t("toolbar.grid"),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: workspace.gridVisible,
											disabled,
											onChange: workspace.toggleGrid
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: GeoGebraWorkspace_module_css_default.switchTrack,
											"aria-hidden": true
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t("toolbar.grid") })
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: GeoGebraWorkspace_module_css_default.switchControl,
									title: props.t("toolbar.axes"),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: workspace.axesVisible,
											disabled,
											onChange: workspace.toggleAxes
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: GeoGebraWorkspace_module_css_default.switchTrack,
											"aria-hidden": true
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t("toolbar.axes") })
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: `${GeoGebraWorkspace_module_css_default.toolbarGroup} ${GeoGebraWorkspace_module_css_default.toolbarActions}`,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: GeoGebraWorkspace_module_css_default.iconButton,
										disabled,
										onClick: workspace.undo,
										title: props.t("toolbar.undo"),
										"aria-label": props.t("toolbar.undo"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: GeoGebraWorkspace_module_css_default.iconButton,
										disabled,
										onClick: workspace.redo,
										title: props.t("toolbar.redo"),
										"aria-label": props.t("toolbar.redo"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: `${GeoGebraWorkspace_module_css_default.iconButton} ${workspace.panelOpen ? GeoGebraWorkspace_module_css_default.activeButton : ""}`,
										onClick: () => {
											workspace.setPanelOpen(!workspace.panelOpen);
										},
										title: props.t("toolbar.panel"),
										"aria-label": props.t("toolbar.panel"),
										"aria-pressed": workspace.panelOpen,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: `${GeoGebraWorkspace_module_css_default.iconButton} ${disabled ? GeoGebraWorkspace_module_css_default.disabledButton : ""}`,
										title: props.t("toolbar.import"),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: GeoGebraWorkspace_module_css_default.srOnly,
												children: props.t("toolbar.import")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "file",
												accept: ".ggb,application/vnd.geogebra.file",
												disabled,
												onChange: workspace.importGgb
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: GeoGebraWorkspace_module_css_default.iconButton,
										disabled,
										onClick: workspace.exportGgb,
										title: props.t("toolbar.exportGgb"),
										"aria-label": props.t("toolbar.exportGgb"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, {})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: GeoGebraWorkspace_module_css_default.textButton,
										disabled,
										onClick: workspace.exportPng,
										title: props.t("toolbar.exportPng"),
										children: "PNG"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: GeoGebraWorkspace_module_css_default.textButton,
										disabled,
										onClick: workspace.exportSvg,
										title: props.t("toolbar.exportSvg"),
										children: "SVG"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: GeoGebraWorkspace_module_css_default.iconButton,
										onClick: workspace.toggleFullscreen,
										title: props.t("toolbar.fullscreen"),
										"aria-label": props.t("toolbar.fullscreen"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFullscreenOutline16, {})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: `${GeoGebraWorkspace_module_css_default.iconButton} ${GeoGebraWorkspace_module_css_default.dangerButton}`,
										disabled,
										onClick: workspace.clear,
										title: props.t("toolbar.clear"),
										"aria-label": props.t("toolbar.clear"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: GeoGebraWorkspace_module_css_default.workArea,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
							className: GeoGebraWorkspace_module_css_default.canvasArea,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								ref: workspace.appletHostRef,
								className: GeoGebraWorkspace_module_css_default.appletHost
							}), workspace.status !== "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: GeoGebraWorkspace_module_css_default.appletState,
								role: "status",
								children: workspace.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: GeoGebraWorkspace_module_css_default.spinner,
									"aria-hidden": true
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t("status.loading") })] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t("status.error") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: GeoGebraWorkspace_module_css_default.retryButton,
									onClick: workspace.retry,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, {}), props.t("applet.retry")]
								})] })
							})]
						}), workspace.panelOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
							className: GeoGebraWorkspace_module_css_default.panel,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: GeoGebraWorkspace_module_css_default.panelSection,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h2", { children: [
									props.t("panel.objects"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: workspace.objects.length })
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: GeoGebraWorkspace_module_css_default.objectList,
									children: workspace.objects.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: GeoGebraWorkspace_module_css_default.emptyState,
										children: props.t("panel.empty")
									}) : workspace.objects.map((object) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: GeoGebraWorkspace_module_css_default.objectRow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: GeoGebraWorkspace_module_css_default.objectColor,
												style: { backgroundColor: object.color },
												"aria-hidden": true
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: GeoGebraWorkspace_module_css_default.objectText,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: object.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													title: object.definition,
													children: object.definition
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
												className: GeoGebraWorkspace_module_css_default.visibilityToggle,
												title: props.t(object.visible ? "object.hide" : "object.show"),
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													type: "checkbox",
													checked: object.visible,
													onChange: () => {
														workspace.toggleObject(object.name, object.visible);
													}
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": true })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: GeoGebraWorkspace_module_css_default.rowAction,
												onClick: () => {
													workspace.deleteObject(object.name);
												},
												title: props.t("object.delete"),
												"aria-label": `${props.t("object.delete")} ${object.name}`,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
											})
										]
									}, object.name))
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: GeoGebraWorkspace_module_css_default.panelSection,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: props.t("panel.examples") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: GeoGebraWorkspace_module_css_default.examples,
									children: EXAMPLES.map((example) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											workspace.runCommandValue(example.command);
										},
										disabled,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.t(example.labelKey) })]
									}, example.id))
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: GeoGebraWorkspace_module_css_default.commandBar,
						onSubmit: workspace.submitCommand,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: GeoGebraWorkspace_module_css_default.srOnly,
								htmlFor: `geogebra-command-${tab.id}`,
								children: props.t("command.label")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: `geogebra-command-${tab.id}`,
								value: workspace.command,
								disabled,
								spellCheck: false,
								placeholder: props.t("command.placeholder"),
								"aria-invalid": workspace.commandError !== void 0,
								onChange: (event) => {
									workspace.setCommand(event.currentTarget.value);
									if (workspace.commandError !== void 0) workspace.setCommandError?.(void 0);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: disabled || workspace.command.trim().length === 0,
								title: props.t("command.run"),
								"aria-label": props.t("command.run"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutline16, {})
							}),
							workspace.commandError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: GeoGebraWorkspace_module_css_default.commandError,
								role: "alert",
								children: workspace.commandError
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/definition.tsx
		const GEOGEBRA_KIND = "geogebra";
		const GEOGEBRA_ID = "dsh-plugin-geogebra-pic";
		function geoGebraDefinition(t) {
			return {
				id: GEOGEBRA_ID,
				kind: GEOGEBRA_KIND,
				multiple: false,
				priority: "extension",
				title: () => t("type.label"),
				guide: [{
					id: "open",
					order: 15,
					title: () => t("guide.title"),
					description: () => t("guide.description"),
					icon: _deepseek_ai_dsh_client_ui_primitives.IconDataOutline16
				}]
			};
		}
		//#endregion
		//#region src/client/locales.ts
		const NS = "geoGebraPic";
		const zh = {
			"type.label": "几何画板",
			"guide.title": "GeoGebra 绘图",
			"guide.description": "函数作图、几何构造与动态图形",
			"action.open": "打开几何画板",
			"status.loading": "正在加载 GeoGebra",
			"status.ready": "已自动保存",
			"status.error": "GeoGebra 加载失败",
			"toolbar.undo": "撤销",
			"toolbar.redo": "重做",
			"toolbar.grid": "网格",
			"toolbar.axes": "坐标轴",
			"toolbar.panel": "对象与示例",
			"toolbar.import": "导入 GGB",
			"toolbar.exportGgb": "导出 GGB",
			"toolbar.exportPng": "导出 PNG",
			"toolbar.exportSvg": "导出 SVG",
			"toolbar.fullscreen": "全屏",
			"toolbar.clear": "清空画板",
			"toolbar.clearConfirm": "确定清空当前画板吗？此操作可通过撤销恢复。",
			"panel.objects": "对象",
			"panel.empty": "画板中还没有对象",
			"panel.examples": "快速示例",
			"example.function": "正弦函数",
			"example.circle": "圆与切线",
			"example.triangle": "三角形外接圆",
			"example.slider": "动态参数",
			"object.hide": "隐藏对象",
			"object.show": "显示对象",
			"object.delete": "删除对象",
			"command.label": "GeoGebra 命令",
			"command.placeholder": "输入命令，例如 f(x) = sin(x)",
			"command.run": "执行命令",
			"command.failed": "命令无法执行，请检查语法",
			"import.failed": "无法读取这个 GGB 文件",
			"applet.retry": "重新加载"
		};
		const en = {
			"type.label": "Geometry Board",
			"guide.title": "GeoGebra Drawing",
			"guide.description": "Plot functions, construct geometry, and explore dynamic figures",
			"action.open": "Open geometry board",
			"status.loading": "Loading GeoGebra",
			"status.ready": "Autosaved",
			"status.error": "GeoGebra failed to load",
			"toolbar.undo": "Undo",
			"toolbar.redo": "Redo",
			"toolbar.grid": "Grid",
			"toolbar.axes": "Axes",
			"toolbar.panel": "Objects and examples",
			"toolbar.import": "Import GGB",
			"toolbar.exportGgb": "Export GGB",
			"toolbar.exportPng": "Export PNG",
			"toolbar.exportSvg": "Export SVG",
			"toolbar.fullscreen": "Fullscreen",
			"toolbar.clear": "Clear board",
			"toolbar.clearConfirm": "Clear the current board? You can undo this action.",
			"panel.objects": "Objects",
			"panel.empty": "No objects on the board yet",
			"panel.examples": "Quick examples",
			"example.function": "Sine function",
			"example.circle": "Circle and tangent",
			"example.triangle": "Triangle circumcircle",
			"example.slider": "Dynamic parameter",
			"object.hide": "Hide object",
			"object.show": "Show object",
			"object.delete": "Delete object",
			"command.label": "GeoGebra command",
			"command.placeholder": "Enter a command, for example f(x) = sin(x)",
			"command.run": "Run command",
			"command.failed": "The command could not be evaluated. Check its syntax.",
			"import.failed": "This GGB file could not be read",
			"applet.retry": "Reload"
		};
		//#endregion
		//#region src/client/index.ts
		const inject = [
			"slots",
			"locale",
			"sidebarRight",
			"sidebarRightTabs"
		];
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "geogebra-pic: dictionaries");
			ctx.effect(() => ctx.sidebarRightTabs.register(geoGebraDefinition(t)), "geogebra-pic: tab type");
			ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
				name: "sidebar.right.pane.tab",
				key: GEOGEBRA_ID,
				locale: NS
			}, GeoGebraWorkspace)), "geogebra-pic: workspace");
			ctx.effect(() => ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "geogebra-pic-open",
				order: 30,
				locale: NS,
				inject: () => ({ openGeoGebra: () => {
					ctx.sidebarRight.openTab(GEOGEBRA_KIND);
				} })
			}, GeoGebraAction)), "geogebra-pic: header action");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map