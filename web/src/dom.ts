type Child = Node | string;

interface Props {
    className?: string;
    text?: string;
    attrs?: Record<string, string>;
}

/** Cria um elemento. O texto entra por textContent, nunca como HTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Props = {},
    children: Child[] = [],
    ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (props.className) node.className = props.className;
    if (props.text !== undefined) node.textContent = props.text;
    for (const [name, value] of Object.entries(props.attrs ?? {})) {
        node.setAttribute(name, value);
    }
    node.append(...children);
    return node;
}