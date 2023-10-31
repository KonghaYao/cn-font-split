export const StyleForFont = (props: { url: string; fontFamily: string }) => {
    return (
        <style>
            {` @font-face {font-family: '${props.fontFamily}';src: url(${props.url});}`}
        </style>
    );
};
