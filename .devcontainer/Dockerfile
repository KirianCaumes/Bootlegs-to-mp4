FROM ubuntu:22.04

# This Dockerfile adds a non-root user with sudo access.
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create the user
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set the default user
USER $USERNAME

RUN sudo apt-get clean
RUN sudo apt-get update
RUN sudo apt-get -y install curl
RUN sudo apt-get -y install git
RUN sudo apt-get update --fix-missing

# install nodejs 16.13
RUN sudo curl -sL https://deb.nodesource.com/setup_16.x | sudo bash -
RUN sudo apt-get install -y nodejs

WORKDIR /app_bootlegs-to-mp4