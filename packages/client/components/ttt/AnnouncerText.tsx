import React from "react";

export const AnnouncerText: React.FC = ({ children }) => (
    <h1
        className="my-8 mx-2 text-center"
        style={{ textShadow: "0 0 10px white" }}
    >
        {children}
    </h1>
);

export default AnnouncerText;
