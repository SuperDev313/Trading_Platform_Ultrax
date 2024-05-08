import React, { useState, useEffect } from "react";
import cx from "classnames";

import { BiChevronDown } from "react-icons/bi";

import Modal from "../Modal/Modal";

import dropDownIcon from "img/DROP_DOWN.svg";
import searchIcon from "img/search.svg";
import "./TokenSelector.css";

export default function TokenSelector(props) {

    return <div className={cx("TokenSelector", { disabled }, props.className, "style-modal-select-tokens")}></div>;
}
