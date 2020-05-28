import React, { ButtonHTMLAttributes, PropsWithChildren } from "react";

type P = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>;

export const Btn: React.FC<P> = props => {
    const { children, className, ...attrs } = props;
    const mixedClassName =
        "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded " +
        (className || "");
    return (
        <button {...attrs} className={mixedClassName}>
            {children}
        </button>
    );
};

export default Btn;
