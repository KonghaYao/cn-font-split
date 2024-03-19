import { atom, reflect } from "@cn-ui/reactive"
import { JSXElement } from "solid-js"
import { useElementBounding } from 'solidjs-use'


export const AbsoluteLayout = (props: {
    render: () => JSXElement[]
    margin?: number
}) => {
    const collection = atom<ReturnType<typeof useElementBounding>[]>([])
    return <div style={{
        position: "relative"
    }}>
        {props.render().map(Comp => {
            const ref = atom(null)
            const size = useElementBounding(ref)
            collection(i => [...i, size])
            const originPoint = reflect(() => {
                const arr = collection()
                const index = arr.findIndex(i => i === size)
                const stack = arr.slice(0, index)
                return stack.reduce((col, cur) => {
                    col.left += cur.width() + (props.margin ?? 10)
                    return col
                }, { top: 0, left: 0 })
            })
            return <div ref={ref} style={{
                position: "absolute",
                display: "flex",
                top: originPoint().top + 'px',
                left: originPoint().left + 'px'
            }}>
                {Comp}
            </div>
        })}

    </div>
}