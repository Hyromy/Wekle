#!/bin/bash

mkdir -p ./frontend/src/idl
cp ./backend/target/idl/backend.json frontend/src/idl
cp ./backend/target/types/* frontend/src/idl
