import autobind from 'core-decorators/lib/autobind';
import Component from 'react-pure-render/component';
import Promise from 'bluebird';
import Radium from 'radium';
import React, { PropTypes as RPT } from 'react';
import { addUploadingDocs, addUploadingImages, filterAllowedFiles, filterDocFiles, filterImageFiles, uploadFiles } from './actions';

const FileAPI = process.env.IS_BROWSER ? Promise.promisifyAll(require('fileapi')) : null;

@Radium
export default class FileUpload extends Component {

  static propTypes = {
    allowedFileTypes: RPT.array,
    children: RPT.element,
    className: RPT.string,
    data: RPT.object,
    dropzoneActiveStyle: RPT.object,
    dropzoneId: RPT.string.isRequired,
    dropzoneStyle: RPT.object,
    identifier: RPT.string,
    multiple: RPT.bool,
    url: RPT.string.isRequired,
  };

  static contextTypes = {
    store: RPT.object.isRequired
  };

  state = {
    dragCount: 0
  };

  componentDidMount() {
    FileAPI.event.on(this.refs.fileInput, 'change', this.handleFileChange);
    FileAPI.event.dnd(this.refs.fileInput, this.handleDragHover, this.handleFileChange);
    document.addEventListener('drop', this.preventDropEvent);
    document.addEventListener('dragover', this.preventDragOverEvent);
    document.addEventListener('dragenter', this.handleDocumentDragEnter);
    document.addEventListener('dragleave', this.handleDocumentDragLeave);
  }

  componentWillUnmount() {
    FileAPI.event.off(this.refs.fileInput, 'change', this.handleFileChange);
    FileAPI.event.dnd.off(this.refs.fileInput, this.handleDragHover, this.handleFileChange);
    document.removeEventListener('drop', this.preventDropEvent);
    document.removeEventListener('dragover', this.preventDragOverEvent);
    document.removeEventListener('dragenter', this.handleDocumentDragEnter);
    document.removeEventListener('dragleave', this.handleDocumentDragLeave);
  }

  @autobind
  handleDragHover(over) {
    this.setState({ dropzoneHover: over });
  }

  @autobind
  handleDocumentDragEnter() {
    const { dragCount } = this.state;

    if (dragCount === 0) this.setState({ dropzoneActive: true });
    this.setState({ dragCount: dragCount + 1 });
  }

  @autobind
  handleDocumentDragLeave(event) {
    const { dragCount } = this.state;

    event.preventDefault();
    if (dragCount === 1) this.setState({ dropzoneActive: false });
    this.setState({ dragCount: dragCount - 1 });
  }

  @autobind
  async handleFileChange(event) {
    const {
      allowedFileTypes,
      data,
      dropzoneId,
      identifier,
      url
     } = this.props;

    const { dispatch } = this.context.store;

    const { dragCount } = this.state;

    if (dragCount === 1)
      this.setState({ dropzoneActive: false, dragCount: dragCount - 1 });

    const allowedFiles = await filterAllowedFiles(event, allowedFileTypes);
    const imageFiles = await filterImageFiles(allowedFiles);
    const docFiles = await filterDocFiles(allowedFiles);
    const reducerIdentificator = identifier || dropzoneId;

    if (!!imageFiles.length) {
      dispatch(addUploadingImages(dropzoneId, imageFiles));
      dispatch(uploadFiles(reducerIdentificator, url, imageFiles, 'image', data));
    }
    if (!!docFiles.length) {
      dispatch(addUploadingDocs(dropzoneId, docFiles));
      dispatch(uploadFiles(reducerIdentificator, url, docFiles, 'document', data));
    }
  }

  @autobind
  preventDropEvent(event) {
    const { dropzoneId } = this.props;
    if (event.target.id !== dropzoneId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'none'; // eslint-disable-line no-param-reassign
    }
  }

  @autobind
  preventDragOverEvent(event) {
    const { dropzoneId } = this.props;
    if (event.target.id !== dropzoneId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'none'; // eslint-disable-line no-param-reassign
    }
  }

  render() {
    const { children, className, dropzoneActiveStyle, dropzoneId, dropzoneStyle, multiple } = this.props;
    const { dropzoneActive } = this.state;

    return (
      <div className={className}>
        <form ref="fileUpload">
          <label style={[dropzoneStyle || styles.dropzone.base, dropzoneActive && (dropzoneActiveStyle || styles.dropzone.active)]}>
            <input
              id={dropzoneId}
              multiple={multiple}
              ref="fileInput"
              style={styles.input}
              type="file"
            />
            {children}
          </label>
        </form>
      </div>
    );
  }

}

const styles = {
  dropzone: {
    base: {
      backgroundColor: 'white',
      display: 'block',
      position: 'relative',
      textAlign: 'center'
    },
    active: {
      border: '1px solid grey',
    }
  },

  input: {
    bottom: 0,
    cursor: 'pointer',
    left: 0,
    opacity: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
    zIndex: 1
  },
};