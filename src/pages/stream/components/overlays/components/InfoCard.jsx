export const InfoCard = ({data}) => {
    return <div
        className="border-3 border-cyan-400 p-3 w-80 absolute bg-cyan-200 duration-1000 ease"
        style={{ top: data.posY, left: data.posX}}
    >
        { data.name}
    </div>
}
