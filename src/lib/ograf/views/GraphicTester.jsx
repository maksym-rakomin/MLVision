import * as React from 'react'
import {useEffect} from 'react'
import {Renderer} from '../renderer/Renderer.js'
import {fileHandler} from '../FileHandler.js'
import {issueTracker} from '../renderer/IssueTracker.js'

import {getDefaultSettings, SettingsContext} from '../contexts/SettingsContext.js'

// todo
function createAutonomousSpeedController() {
    const MIN_SPEED = 80
    const MAX_SPEED = 150
    const SMOOTHING_FACTOR = 0.1 // Чем меньше, тем плавнее
    const TARGET_CHANGE_INTERVAL = 100 // Количество "тиков" перед сменой целевой скорости

    let currentSpeed = MIN_SPEED // Начальная скорость
    let targetSpeed = MAX_SPEED   // Начальная целевая скорость
    let ticks = 0                 // Счетчик "тиков" для смены целевой скорости

    // Возвращаем внутреннюю функцию, которая будет управлять скоростью
    return function () {
        ticks++

        // Меняем целевую скорость время от времени
        if (ticks % TARGET_CHANGE_INTERVAL === 0) {
            // Переключаем целевую скорость между MIN_SPEED, MAX_SPEED и серединой
            if (targetSpeed === MAX_SPEED) {
                targetSpeed = MIN_SPEED
            } else if (targetSpeed === MIN_SPEED) {
                targetSpeed = Math.floor(Math.random() * (MAX_SPEED - MIN_SPEED + 1) + MIN_SPEED) // Случайное значение
            } else {
                targetSpeed = MAX_SPEED
            }
            // console.log(`[Автоконтроль] Новая целевая скорость: ${targetSpeed.toFixed(0)} км/ч`)
        }

        // 1. Ограничиваем целевую скорость нашими пределами (хотя она уже должна быть в них)
        let clampedTarget = Math.max(MIN_SPEED, Math.min(MAX_SPEED, targetSpeed))

        // 2. Рассчитываем разницу.
        const difference = clampedTarget - currentSpeed

        // 3. Плавно изменяем текущую скорость.
        currentSpeed += (difference * SMOOTHING_FACTOR)

        // 4. Убеждаемся, что новая скорость остается в пределах.
        currentSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, currentSpeed))

        return currentSpeed
    }
}

const getNextSpeed = createAutonomousSpeedController()

function getColorFromValue(value) {
    const minValue = 80
    const maxValue = 150

    // Ограничиваем значение, чтобы оно не выходило за пределы диапазона
    const clampedValue = Math.max(minValue, Math.min(maxValue, value))

    // Нормализуем значение в диапазон от 0 до 1
    const normalizedValue = (clampedValue - minValue) / (maxValue - minValue)

    // Интерполируем между зеленым (0, 255, 0) и красным (255, 0, 0)
    const red = Math.floor(255 * normalizedValue)
    const green = Math.floor(255 * (1 - normalizedValue))
    const blue = 0

    // Форматируем в HEX-код
    // Используем padStart для добавления ведущих нулей, если число меньше 16 (F)
    const toHex = (c) => c.toString(16).padStart(2, '0')

    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

// todo

const VIDEO_WIDTH = 1280
const VIDEO_HEIGHT = 720


function GraphicTester({graphic, track, containerScale}) {

    const [settings, setSettings] = React.useState(getDefaultSettings())

    const onSettingsChange = React.useCallback((newSettings) => {
        setSettings(newSettings)
        localStorage.setItem('settings', JSON.stringify(newSettings))
    }, [])

    const [graphicManifest, setGraphicManifest] = React.useState(null)


    const previewContainerRef = React.useRef(null)
    const [_scale, setScale] = React.useState(1)

    const canvasRef = React.useRef(null)
    const rendererRef = React.useRef(null)

    const updateScale = React.useCallback(() => {
        if (previewContainerRef.current) {
            const containerWidth = previewContainerRef.current.clientWidth
            const widthScale = containerWidth / settings.width

            const containerHeight = previewContainerRef.current.clientHeight
            const heightScale = containerHeight / settings.height

            setScale(heightScale < widthScale ? heightScale : widthScale)
        }
    }, [settings])

    const onError = React.useCallback((e) => {
        console.error(e)
    }, [])

    React.useLayoutEffect(() => {
        if (!rendererRef.current) {
            if (canvasRef.current) {
                rendererRef.current = new Renderer(canvasRef.current)
                rendererRef.current.setGraphic(graphic)
            }
        }
    }, [graphic])

    React.useLayoutEffect(() => {
        updateScale()

        // Add a delayed updateScale call to ensure proper dimensions
        const timeoutId = setTimeout(() => {
            updateScale()
        }, 100)

        // Clean up timeout if component unmounts
        return () => clearTimeout(timeoutId)
    }, [updateScale])

    React.useLayoutEffect(() => {
        updateScale()
        window.addEventListener('resize', updateScale)
        return () => {
            window.removeEventListener('resize', updateScale)
        }
    }, [updateScale])

    React.useEffect(() => {
        rendererRef.current.setGraphic(graphic)
    }, [graphic])

    React.useEffect(() => {
        const listener = fileHandler.listenToFileChanges(() => {
            // on File change
            triggerReloadGraphic()
        })
        return () => {
            listener.stop()
        }
    }, [])


    const settingsRef = React.useRef(settings)
    React.useEffect(() => {
        settingsRef.current = settings
        triggerReloadGraphic()
    }, [settings])

    const [isReloading, setIsReloading] = React.useState(false)
    React.useEffect(() => {
        if (isReloading) {
            const timeout = setTimeout(() => setIsReloading(false), 100)
            return () => clearTimeout(timeout)
        }
    }, [isReloading])

    const reloadGraphic = React.useCallback(async () => {
        await rendererRef.current.clearGraphic()
        issueTracker.clear()
        await reloadGraphicManifest()
        await rendererRef.current.loadGraphic(settingsRef.current).catch(issueTracker.addError)

        setIsReloading(true)
    }, [])

    const reloadGraphicManifest = React.useCallback(async () => {
        // console.log(444, graphic)
        // const url = graphicResourcePath(graphic.path)
        // const r = await fetch(url)
        // const manifest = await r.json()
        setGraphicManifest(graphic.manifest)
        // setGraphicManifest((prevValue) => {
        // 	if (JSON.stringify(prevValue) !== JSON.stringify(manifest)) {
        // 		return manifest
        // 	} else return prevValue
        // })
    }, [graphic.path])

    const triggerReloadGraphicRef = React.useRef({})
    const triggerReloadGraphic = React.useCallback(() => {
        const timeSinceLastCall = Date.now() - (triggerReloadGraphicRef.current.lastCall || 0)
        if (timeSinceLastCall < 10) return
        triggerReloadGraphicRef.current.lastCall = Date.now()

        if (triggerReloadGraphicRef.current.reloadInterval) clearTimeout(triggerReloadGraphicRef.current.reloadInterval)

        reloadGraphic()
            .then(async () => {
                if (settingsRef.current.realtime) {
                    let i = 0
                    for (const action of scheduleRef.current) {
                        i++
                        // If auto-reload is disabled, just execute all actions in 100ms intervals:
                        const delay = triggerReloadGraphicRef.current.autoReloadEnable ? action.timestamp : i * 100

                        setTimeout(() => {
                            // if (!triggerReloadGraphicRef.current.activeAutoReload) return

                            rendererRef.current
                                .invokeGraphicAction(action.action.type, action.action.params)
                                .catch(issueTracker.addError)
                        }, delay)
                    }
                    if (triggerReloadGraphicRef.current.activeAutoReload) {
                        triggerReloadGraphicRef.current.reloadInterval = setTimeout(() => {
                            triggerReloadGraphicRef.current.reloadInterval = 0

                            if (triggerReloadGraphicRef.current.activeAutoReload && triggerReloadGraphicRef.current.autoReloadEnable)
                                triggerReloadGraphic()
                        }, triggerReloadGraphicRef.current.duration)
                    }
                } else {
                    // non-realtime
                    await rendererRef.current.setActionsSchedule(scheduleRef.current).catch(issueTracker.addError)
                    rendererRef.current.gotoTime(playTimeRef.current).catch(issueTracker.addError)
                }
            })
            .catch(onError)
    }, [])

    React.useEffect(() => {
        triggerReloadGraphicRef.current.autoReloadEnable = settings.autoReloadEnable
        triggerReloadGraphicRef.current.duration = settings.duration

        if (triggerReloadGraphicRef.current.autoReloadEnable) {
            triggerReloadGraphicRef.current.activeAutoReload = true

            const initTimeout = setTimeout(() => {
                triggerReloadGraphic()
            }, 100)
            return () => {
                clearTimeout(initTimeout)
                triggerReloadGraphicRef.current.activeAutoReload = false
                if (triggerReloadGraphicRef.current.reloadInterval) clearTimeout(triggerReloadGraphicRef.current.reloadInterval)
            }
        } else {
            triggerReloadGraphicRef.current.activeAutoReload = false
        }
    }, [settings])

    const playTimeRef = React.useRef(0)

    const scheduleRef = React.useRef([])


    // Load the graphic manifest:
    React.useEffect(() => {
        if (!graphicManifest) reloadGraphicManifest().catch(onError)
    }, [])


    useEffect(() => {
        if (!rendererRef?.current || !rendererRef?.current.updateAction) {
            return
        }

        if (!track || !track.bbox || !previewContainerRef.current) {
            // Если трека нет, скрываем компонент. Это важно для пулинга.
            if (previewContainerRef.current) {
                previewContainerRef.current.style.visibility = 'hidden';
            }
            return;
        }

        // Если есть, делаем видимым
        previewContainerRef.current.style.visibility = 'visible';

        // Create data object - no useMemo needed here as we're already in a dependency-controlled effect
        // const data = {
        //     _title: `${track?.class_name} - ${track?.track_id}`,
        //     _subtitle: `Current speed: ${getNextSpeed().toFixed(2)} km/h`,
        //     _color: getColorFromValue(+getNextSpeed().toFixed(0))
        // }
        const data = {
            _team: `${track?.class_name} - ${track?.track_id}`,
            _driver: `Current speed: ${getNextSpeed().toFixed(2)} km/h`,
            _car_position: getColorFromValue(+getNextSpeed().toFixed(0))
        }

        // Batch updates to reduce rendering cycles
        const updateGraphic = () => {
            issueTracker.clear()

            // Update action data
            if (rendererRef.current?.updateAction) {
                rendererRef.current.updateAction({data}).catch(issueTracker.addError)
            }

            // Update position
            if (rendererRef.current?.layer?.currentGraphic?.element && track?.bbox) {
                rendererRef.current.layer.currentGraphic.element.style.transform =
                    `translate(${(track.bbox[0] - (250 * 250 / 1920)) * containerScale}px,
                     ${((track.bbox[1] - (200 * 200 / 1920)) * containerScale)}px)
                      scale(${(track.bbox[2] - track.bbox[0]) / (1920 - 250)})`
            }
            // if (rendererRef.current?.layer?.currentGraphic?.element && track?.bbox) {
            //     rendererRef.current.layer.currentGraphic.element.style.transform =
            //         `translate(${(track.bbox[0]) * containerScale}px,
            //          ${((track.bbox[1]) * containerScale)}px)
            //           scale(${(track.bbox[2] - track.bbox[0]) / (1920 - 250)})`
            // }
        }

        // translate(296px, 203.5px) scale(1, 1) rotate(0deg)

        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(updateGraphic)

    }, [track?.class_name, track?.track_id, track?.bbox])


    return (
        <SettingsContext.Provider value={{settings, onChange: onSettingsChange}}>

            <div
                ref={previewContainerRef}
                className="preview-container-ref"
                style={{
                    width: '100%',
                    // position: 'absolute',
                    overflow: 'hidden',
                    transition: '0.2s all ease-out',
                    position: 'absolute',
                    top: '0px',
                    bottom: '0px',
                    visibility: 'hidden',
                }}
            >

                <div
                    ref={canvasRef}
                    className={'graphic-canvas'}
                    style={{
                        position: 'relative',
                        display: 'block',
                        border: 'none',
                        width: '100%',
                        height: '100%',
                        aspectRatio: `1 / 0.5`,
                    }}
                />
            </div>

            {/*<ButtonGroup>*/}
            {/*    <Button*/}
            {/*        onClick={() => {*/}
            {/*            issueTracker.clear()*/}
            {/*            rendererRef.current*/}
            {/*                .playAction({*/}
            {/*                    skipAnimation: false,*/}
            {/*                })*/}
            {/*                .catch(issueTracker.addError)*/}
            {/*        }}*/}
            {/*    >*/}
            {/*        Play*/}
            {/*    </Button>*/}
            {/*    <Button*/}
            {/*        onClick={() => {*/}
            {/*            issueTracker.clear()*/}
            {/*            rendererRef.current*/}
            {/*                .stopAction({*/}
            {/*                    skipAnimation: false,*/}
            {/*                })*/}
            {/*                .catch(issueTracker.addError)*/}
            {/*        }}*/}
            {/*    >*/}
            {/*        Stop*/}
            {/*    </Button>*/}
            {/*</ButtonGroup>*/}


            {/*<div className="container-md sidebar">*/}
            {/*    <div className="graphic-tester card">*/}
            {/*        <div className="card-body">*/}

            {/*            {graphicManifest ? (*/}
            {/*                <>*/}
            {/*                    <div className="control">*/}
            {/*                        (*/}
            {/*                        <GraphicControlRealTime*/}
            {/*                            rendererRef={rendererRef}*/}
            {/*                            schedule={schedule}*/}
            {/*                            setActionsSchedule={setActionsSchedule}*/}
            {/*                            manifest={graphicManifest}*/}
            {/*                        />*/}
            {/*                        )*/}
            {/*                    </div>*/}
            {/*                </>*/}
            {/*            ) : (*/}
            {/*                <div>Loading manifest...</div>*/}
            {/*            )}*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</div>*/}

        </SettingsContext.Provider>
    )
}

// Memoize the GraphicTester component to prevent unnecessary re-renders
// arePropsEqual теперь должен включать containerScale
const arePropsEqual = (prevProps, nextProps) => {
    if (!prevProps.track || !nextProps.track) {
        return prevProps.track === nextProps.track;
    }

    return (
        prevProps.graphic === nextProps.graphic &&
        prevProps.containerScale === nextProps.containerScale && // <-- Важное добавление
        prevProps.track.bbox?.[0] === nextProps.track.bbox?.[0] &&
        prevProps.track.bbox?.[1] === nextProps.track.bbox?.[1] &&
        prevProps.track.class_name === nextProps.track.class_name
    );
};

export default React.memo(GraphicTester, arePropsEqual);
