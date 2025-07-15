import * as React from 'react'
import {Button, ButtonGroup} from 'react-bootstrap'
import {issueTracker} from '../renderer/IssueTracker.js'
import {GDDGUI} from '../lib/GDD/gdd-gui.jsx'
import {getDefaultDataFromSchema} from '../lib/GDD/gdd/data.js'
import {SettingsContext} from '../contexts/SettingsContext.js'

export function GraphicControlRealTime({rendererRef, manifest}) {
    const settingsContext = React.useContext(SettingsContext)
    const settings = settingsContext.settings

    const initialData = manifest.schema ? getDefaultDataFromSchema(manifest.schema) : {}
    const [data, setData] = React.useState(initialData)
    const onDataSave = (d) => {
        console.log('Data saved:', d)
        setData(JSON.parse(JSON.stringify(d)))
    }

    rendererRef.current.setData(data)

    return (
        <div>

            <div>
                <Button
                    onClick={() => {
                        issueTracker.clear()
                        rendererRef.current.loadGraphic(settings).catch(issueTracker.addError)
                    }}
                >
                    Load Graphic
                </Button>
                <Button
                    onClick={() => {
                        rendererRef.current.clearGraphic().catch(issueTracker.addError)
                    }}
                >
                    Clear Graphic
                </Button>
            </div>
            <div>
                <div className="graphics-manifest-schema">
                    {manifest.schema && <GDDGUI schema={manifest.schema} data={data} setData={onDataSave}/>}
                </div>
            </div>

            <div>
                <ButtonGroup>
                    <Button
                        onClick={() => {
                            issueTracker.clear()
                            rendererRef.current.updateAction({data}).catch(issueTracker.addError)
                        }}
                    >
                        Update
                    </Button>
                    <Button
                        onClick={() => {
                            issueTracker.clear()
                            rendererRef.current
                                .playAction({
                                    skipAnimation: false,
                                })
                                .catch(issueTracker.addError)
                        }}
                    >
                        Play
                    </Button>
                    <Button
                        onClick={() => {
                            issueTracker.clear()
                            rendererRef.current
                                .stopAction({
                                    skipAnimation: false,
                                })
                                .catch(issueTracker.addError)
                        }}
                    >
                        Stop
                    </Button>
                </ButtonGroup>
            </div>
        </div>
    )
}

