import React from "react";

import { withUserLoginControl } from "../components/withUserLoginControl";
import { UserBar } from "../components/UserBar";
import { Game } from "../components/Game";

export const IndexPage: React.FC = () => {
    return (
        <div className="absolute inset-0" style={{ backgroundColor: "bisque" }}>
            {/* positioning for the userbar (top-left) */}
            <div className="fixed right-0 top-0" style={{ zIndex: 200 }}>
                {withUserLoginControl(UserBar)}
            </div>

            <Game></Game>
        </div>
    );
};

export default IndexPage;
